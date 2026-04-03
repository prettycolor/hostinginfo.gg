"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export function HeroIntro() {
  const containerRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLDivElement>(null);
  const line2Ref = useRef<HTMLDivElement>(null);
  const cyclingTextRef = useRef<HTMLDivElement>(null);
  const [showCyclingText, setShowCyclingText] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [supportsClipText] = useState(() => {
    const isFirefoxBrowser =
      typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent);
    if (isFirefoxBrowser) {
      return false;
    }
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
      return true;
    }
    return (
      CSS.supports("background-clip: text") ||
      CSS.supports("-webkit-background-clip: text")
    );
  });

  const phrases = [
    "DNS Information Scanner",
    "WhoIS Data",
    "Email DNS Tool",
    "Website & Email Hosting Checker",
    "Firewall and Malware Checker",
    "PDF Reports For Clients",
    "Performance Tracking Over Time",
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Line 1: "All-In-One Hosting Tool"
      if (line1Ref.current) {
        const chars1 = line1Ref.current.querySelectorAll(".char");

        tl.from(chars1, {
          opacity: 0,
          y: 100,
          rotationX: -90,
          stagger: 0.03,
          duration: 0.8,
          ease: "back.out(1.7)",
        })
          .to(
            chars1,
            supportsClipText
              ? {
                  color: "transparent",
                  backgroundImage:
                    "linear-gradient(135deg, #9333ea 0%, #c084fc 50%, #e879f9 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  stagger: 0.02,
                  duration: 0.6,
                  ease: "power2.inOut",
                }
              : {
                  color: "#7e22ce",
                  backgroundImage: "none",
                  stagger: 0.02,
                  duration: 0.6,
                  ease: "power2.inOut",
                },
            "-=0.4",
          )
          .to(
            chars1,
            {
              textShadow:
                "0 0 20px rgba(147, 51, 234, 0.8), 0 0 40px rgba(147, 51, 234, 0.4)",
              stagger: 0.02,
              duration: 0.4,
              ease: "power2.out",
            },
            "-=0.3",
          );
      }

      // Line 2: "For Professional Web Masters of ALL Levels"
      if (line2Ref.current) {
        const chars2 = line2Ref.current.querySelectorAll(".char");

        tl.from(
          chars2,
          {
            opacity: 0,
            scale: 0,
            rotation: 180,
            stagger: 0.02,
            duration: 0.6,
            ease: "back.out(2)",
          },
          "-=0.5",
        ).to(
          chars2,
          supportsClipText
            ? {
                color: "transparent",
                backgroundImage:
                  "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                stagger: 0.015,
                duration: 0.5,
                ease: "power2.inOut",
              }
            : {
                color: "#2563eb",
                backgroundImage: "none",
                stagger: 0.015,
                duration: 0.5,
                ease: "power2.inOut",
              },
          "-=0.3",
        );
      }

      // Continuous floating animation for line 1
      if (line1Ref.current) {
        gsap.to(line1Ref.current, {
          y: -10,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 2,
        });
      }

      // Subtle rotation wobble for line 1
      if (line1Ref.current) {
        gsap.to(line1Ref.current, {
          rotationY: 5,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 2,
        });
      }

      // Background glow pulse
      if (containerRef.current) {
        gsap.to(containerRef.current, {
          "--glow-opacity": 0.3,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 2,
        });
      }

      // After 2.5 seconds, transition line 2 to cycling text (faster transition)
      tl.to({}, { duration: 2.5 }, "+=0") // Wait 2.5 seconds (reduced from 3)
        .to(line2Ref.current, {
          opacity: 0,
          y: -20,
          duration: 0.4,
          ease: "power2.in",
        })
        .call(
          () => {
            setShowCyclingText(true);
          },
          undefined,
          "-=0.2",
        ); // Start showing cycling text before fade completes
    });

    return () => ctx.revert();
  }, [supportsClipText]);

  // Cycling text animation - Smooth typewriter effect (left to right, right to left)
  useEffect(() => {
    if (!showCyclingText || !cyclingTextRef.current) return;

    // Animate the FIRST phrase immediately when cycling text appears
    const animateFirstPhrase = () => {
      const ctx = gsap.context(() => {
        const chars = cyclingTextRef.current?.querySelectorAll(".cycling-char");
        if (!chars) return;

        // Set all characters to invisible initially
        gsap.set(chars, { opacity: 0 });

        // Typewriter write - left to right
        gsap.to(chars, {
          opacity: 1,
          stagger: {
            each: 0.06, // 60ms per character for smooth writing
            from: "start", // Start from beginning (left to right)
          },
          duration: 0.2,
          ease: "none", // Linear for smooth typewriter effect
        });
      });

      return () => ctx.revert();
    };

    // Trigger first phrase animation immediately
    const firstAnimationTimeout = setTimeout(animateFirstPhrase, 100);

    const cycleInterval = setInterval(() => {
      const ctx = gsap.context(() => {
        const chars = cyclingTextRef.current?.querySelectorAll(".cycling-char");
        if (!chars) return;

        const tl = gsap.timeline();

        // Typewriter delete - right to left (reverse stagger)
        tl.to(chars, {
          opacity: 0,
          stagger: {
            each: 0.05, // 50ms per character
            from: "end", // Start from the end (right to left)
          },
          duration: 0.2,
          ease: "none", // Linear for smooth typewriter effect
        })
          .call(() => {
            setCurrentPhrase((prev) => (prev + 1) % phrases.length);
          })
          .to({}, { duration: 0.05 }) // Small delay to let React re-render
          .call(() => {
            // Get the NEW characters after React re-renders
            const newChars =
              cyclingTextRef.current?.querySelectorAll(".cycling-char");
            if (!newChars) return;

            // Set new characters to invisible
            gsap.set(newChars, { opacity: 0 });

            // Typewriter write - left to right
            gsap.to(newChars, {
              opacity: 1,
              stagger: {
                each: 0.06, // 60ms per character for smooth writing
                from: "start", // Start from beginning (left to right)
              },
              duration: 0.2,
              ease: "none", // Linear for smooth typewriter effect
            });
          });
      });

      return () => ctx.revert();
    }, 13700); // Change phrase every 13.7 seconds

    return () => {
      clearTimeout(firstAnimationTimeout);
      clearInterval(cycleInterval);
    };
  }, [showCyclingText, currentPhrase, phrases.length]);

  const splitText = (text: string) => {
    return text.split("").map((char, i) => (
      <span
        key={i}
        className="char inline-block"
        style={{
          display: char === " " ? "inline" : "inline-block",
          width: char === " " ? "0.3em" : "auto",
          lineHeight: "1.2",
          paddingBottom: char === " " ? undefined : "0.08em",
          overflow: "visible",
          verticalAlign: "bottom",
        }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  };

  const splitCyclingText = (text: string) => {
    return text.split("").map((char, i) => (
      <span
        key={`${text}-${i}`}
        className="cycling-char inline-block"
        style={{
          display: char === " " ? "inline" : "inline-block",
          width: char === " " ? "0.3em" : "auto",
          opacity: 0, // Start invisible for typewriter effect
        }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  };

  return (
    <div
      ref={containerRef}
      className="text-center mb-16 space-y-6 perspective-1000 relative"
      style={
        {
          perspective: "1000px",
          "--glow-opacity": 0,
        } as React.CSSProperties & { "--glow-opacity": number }
      }
    >
      {/* Animated background glow - Enhanced for light mode */}
      <div
        className="absolute inset-0 -z-10 blur-3xl light:blur-[100px]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(147, 51, 234, var(--glow-opacity)), transparent 70%)",
          opacity: "var(--glow-opacity)",
        }}
      />
      {/* Light mode additional glow layer */}
      <div
        className="absolute inset-0 -z-10 blur-[120px] opacity-0 light:opacity-20"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(147, 51, 234, 0.4), rgba(59, 130, 246, 0.3) 40%, transparent 70%)",
        }}
      />

      {/* Line 1: All-In-One Hosting Tool - Enhanced for light mode */}
      <div
        ref={line1Ref}
        className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight light:drop-shadow-[0_4px_12px_rgba(147,51,234,0.25)] prevent-cutoff hero-text"
        style={{
          transformStyle: "preserve-3d",
          fontFamily: "system-ui, -apple-system, sans-serif",
          letterSpacing: "-0.02em",
          lineHeight: "1.28",
          paddingBottom: "0.2em",
          marginBottom: "0.06em",
          overflow: "visible",
          WebkitFontSmoothing: "antialiased",
          textRendering: "optimizeLegibility",
          textShadow: "0 1px 0 rgba(147, 51, 234, 0.14)",
        }}
      >
        {splitText("All-In-One Hosting Tool")}
      </div>

      {/* Line 2 Container - Fixed height to prevent layout shift */}
      <div className="relative" style={{ minHeight: "4rem", height: "4rem" }}>
        {/* Line 2: For Professional Web Masters of ALL Levels - Enhanced for light mode */}
        <div
          ref={line2Ref}
          className="absolute inset-0 flex items-center justify-center text-xl md:text-3xl lg:text-4xl font-bold tracking-wide px-4 light:drop-shadow-[0_2px_8px_rgba(59,130,246,0.2)]"
          style={{
            transformStyle: "preserve-3d",
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: "0.02em",
            opacity: showCyclingText ? 0 : 1,
            lineHeight: "1.3",
          }}
        >
          {splitText("For Professional Web Masters of ALL Levels")}
        </div>

        {/* Cycling Text - Same style as line 2, enhanced for light mode */}
        {showCyclingText && (
          <div
            ref={cyclingTextRef}
            className="absolute inset-0 flex items-center justify-center text-xl md:text-3xl lg:text-4xl font-bold tracking-wide px-4 light:drop-shadow-[0_2px_8px_rgba(59,130,246,0.2)]"
            style={{
              transformStyle: "preserve-3d",
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: "0.02em",
              lineHeight: "1.3",
            }}
          >
            <div
              className="inline-block text-center"
              style={{
                color: supportsClipText ? "transparent" : "#2563eb",
                backgroundImage: supportsClipText
                  ? "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)"
                  : "none",
                backgroundClip: supportsClipText ? "text" : undefined,
                WebkitBackgroundClip: supportsClipText ? "text" : undefined,
                maxWidth: "90vw", // Prevent overflow on mobile
              }}
            >
              {splitCyclingText(phrases[currentPhrase])}
            </div>
          </div>
        )}
      </div>

      {/* Decorative elements */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>
    </div>
  );
}
