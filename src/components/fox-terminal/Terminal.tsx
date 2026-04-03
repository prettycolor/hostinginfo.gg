import { useState, useEffect, useRef, ReactNode } from 'react';
import { CommandProcessor } from './CommandProcessor';
import { useTerminalStore } from '@/lib/fox-terminal/terminal-store';
import { useSoundEffects } from '@/lib/fox-terminal/sound-effects';
import { getAnimatedEasterEgg } from './easter-eggs/AnimatedEasterEggs';

export function Terminal() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ type: 'input' | 'output' | 'error' | 'component'; text?: string; component?: ReactNode }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const { commandHistory, addToHistory } = useTerminalStore();
  const { playSound } = useSoundEffects();

  useEffect(() => {
    // Welcome message
    setHistory([
      { type: 'output', text: '╔═══════════════════════════════════════════════════════════╗' },
      { type: 'output', text: '║  🦊 WELCOME TO HT TERMINAL - HOSTINGINFO COMMAND CENTER  ║' },
      { type: 'output', text: '╚═══════════════════════════════════════════════════════════╝' },
      { type: 'output', text: '' },
      { type: 'output', text: '> System Online | All Systems Operational' },
      { type: 'output', text: '> Type "help" for available commands' },
      { type: 'output', text: '> Type "easter" to discover hidden features' },
      { type: 'output', text: '' },
    ]);

    // Focus input
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    playSound('type');

    // Add input to history
    const newHistory = [...history, { type: 'input' as const, text: `> ${input}` }];
    setHistory(newHistory);

    // Check for animated easter eggs first (with error boundaries)
    const animatedEgg = getAnimatedEasterEgg(input.trim().toLowerCase());
    
    if (animatedEgg) {
      // Add animated component to history
      setHistory([...newHistory, { type: 'component' as const, component: animatedEgg }]);
    } else {
      // Process regular command
      const output = CommandProcessor.process(input.trim());
      
      // Add output to history
      setHistory([...newHistory, ...output.map(text => ({ type: 'output' as const, text }))]);
    }

    // Save to command history
    addToHistory(input.trim());

    // Clear input
    setInput('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < commandHistory.length) {
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto overflow-x-hidden terminal-content min-h-0"
        style={{ padding: '1.5rem', paddingBottom: '0.5rem' }}
      >
        {history.map((line, i) => (
          <div
            key={i}
            className={`terminal-line ${
              line.type === 'input' ? 'terminal-prompt' : ''
            } ${
              line.type === 'error' ? 'terminal-error' : ''
            } ${
              line.type === 'output' ? 'terminal-output' : ''
            }`}
            style={{ marginBottom: '0.5rem' }}
          >
            {line.type === 'component' ? line.component : line.text}
          </div>
        ))}
      </div>

      {/* Input Line */}
      <form onSubmit={handleSubmit} className="terminal-input-line">
        <span className="terminal-prompt">root@hostinginfo:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="terminal-input"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="terminal-cursor">█</span>
      </form>
    </div>
  );
}
