import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

/**
 * TypewriterText Component
 * 
 * Cycles through phrases with a typewriter effect
 * Inspired by ToyFight.co
 * 
 * Features:
 * - Types out each character one by one
 * - Pauses at the end of each phrase
 * - Deletes the phrase character by character
 * - Cycles through all phrases continuously
 * - Blinking cursor effect
 */

interface TypewriterTextProps {
  phrases: string[];
  typingSpeed?: number;    // ms per character when typing
  deletingSpeed?: number;  // ms per character when deleting
  pauseDuration?: number;  // ms to pause at end of phrase
  className?: string;
  cursorClassName?: string;
}

export function TypewriterText({
  phrases,
  typingSpeed = 80,
  deletingSpeed = 50,
  pauseDuration = 2000,
  className = '',
  cursorClassName = ''
}: TypewriterTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];

    // If paused, wait before starting to delete
    if (isPaused) {
      const pauseTimeout = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(pauseTimeout);
    }

    // If we've finished typing the current phrase
    if (!isDeleting && currentText === currentPhrase) {
      setIsPaused(true);
      return;
    }

    // If we've finished deleting
    if (isDeleting && currentText === '') {
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    // Type or delete one character
    const timeout = setTimeout(
      () => {
        if (isDeleting) {
          // Delete one character
          setCurrentText(currentPhrase.substring(0, currentText.length - 1));
        } else {
          // Type one character
          setCurrentText(currentPhrase.substring(0, currentText.length + 1));
        }
      },
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, isPaused, currentPhraseIndex, phrases, typingSpeed, deletingSpeed, pauseDuration]);

  // Animate cursor blinking
  useEffect(() => {
    if (!cursorRef.current) return;

    gsap.to(cursorRef.current, {
      opacity: 0,
      duration: 0.5,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
    });
  }, []);

  // Initial fade-in animation
  useEffect(() => {
    if (!textRef.current) return;

    gsap.fromTo(
      textRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
    );
  }, []);

  return (
    <span className="inline-flex items-center">
      <span ref={textRef} className={className}>
        {currentText}
      </span>
      <span
        ref={cursorRef}
        className={`inline-block w-0.5 h-[1em] ml-1 bg-current ${cursorClassName}`}
      />
    </span>
  );
}
