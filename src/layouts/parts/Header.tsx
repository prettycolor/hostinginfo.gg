import { Link, useLocation, useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTerminalStore } from "@/lib/terminal/terminal-store";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  Settings,
  LayoutDashboard,
  Calculator,
  DoorOpen,
  UserRoundPlus,
  Archive,
  Layers,
  Crown,
  ImageIcon,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { getUserTier } from "@/lib/tier-system";
import { getUserDisplayName, getUserInitials } from "@/lib/user-display";
import { AnimatedFlameIcon } from "@/components/AnimatedFlameIcon";
import gsap from "gsap";

const HEADER_VARIATIONS = [
  { middle: "tool", extension: ".dev" },
  { middle: "info", extension: ".gg" },
  { middle: "tool", extension: ".dev" },
  { middle: "info", extension: ".io" },
];

/**
 * Liquid Energy Fusion Auth Buttons Component
 *
 * Features:
 * - Energy pulse glow (continuous pulsing box shadow)
 * - Click ripple rings (3 expanding rings)
 * - Button pulse feedback (scale animation)
 * - Stable performance, no visual conflicts
 */
function LiquidEnergyButtons() {
  const loginRef = useRef<HTMLButtonElement>(null);
  const signupRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const handleButtonClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    path: string,
  ) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Create expanding energy rings (3 rings)
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement("div");
      ring.className = "absolute rounded-full pointer-events-none";
      ring.style.left = `${x}px`;
      ring.style.top = `${y}px`;
      ring.style.width = "0px";
      ring.style.height = "0px";
      ring.style.transform = "translate(-50%, -50%)";
      ring.style.border = "2px solid";
      ring.style.borderColor =
        button === loginRef.current
          ? "rgba(59, 130, 246, 0.6)"
          : "rgba(139, 92, 246, 0.6)";

      button.appendChild(ring);

      gsap.to(ring, {
        width: 200,
        height: 200,
        opacity: 0,
        borderWidth: 0,
        duration: 1,
        delay: i * 0.1,
        ease: "power2.out",
        onComplete: () => ring.remove(),
      });
    }

    // Button pulse feedback
    gsap.to(button, {
      scale: 0.95,
      duration: 0.1,
      ease: "power2.out",
      onComplete: () => {
        gsap.to(button, {
          scale: 1,
          duration: 0.2,
          ease: "back.out(1.7)",
        });
      },
    });

    // Navigate immediately - ScrollToTop component will handle scroll position
    navigate(path);
  };

  useEffect(() => {
    const buttons = [
      { ref: loginRef, color: "rgba(59, 130, 246, 0.6)" },
      { ref: signupRef, color: "rgba(139, 92, 246, 0.6)" },
    ];

    const timelines: gsap.core.Timeline[] = [];

    buttons.forEach(({ ref, color }) => {
      if (!ref.current) return;

      // Continuous energy pulse glow (subtle and noticeable)
      const glowTimeline = gsap.timeline({ repeat: -1, yoyo: true });
      glowTimeline.to(ref.current, {
        boxShadow: `0 0 12px ${color.replace("0.6", "0.25")}, 0 0 25px ${color.replace("0.6", "0.15")}`,
        duration: 2,
        ease: "sine.inOut",
      });

      timelines.push(glowTimeline);
    });

    return () => {
      timelines.forEach((tl) => tl.kill());
    };
  }, []);

  return (
    <div className="flex gap-4">
      <Button
        ref={loginRef}
        variant="outline"
        size="sm"
        className="gap-2 relative border-2 border-blue-600 bg-blue-50/50 text-blue-700 overflow-hidden hidden sm:inline-flex hover:bg-blue-100 hover:border-blue-700 dark:border-blue-500 dark:bg-transparent dark:text-blue-400 dark:hover:bg-blue-950/30"
        onClick={(e) => handleButtonClick(e, "/login")}
      >
        <DoorOpen className="h-4 w-4" />
        Login
      </Button>
      <Button
        ref={signupRef}
        size="sm"
        className="gap-2 relative bg-gradient-to-r from-purple-600 to-blue-600 overflow-hidden shadow-lg shadow-purple-500/30 dark:shadow-none"
        onClick={(e) => handleButtonClick(e, "/signup")}
      >
        <UserRoundPlus className="h-4 w-4" />
        Sign Up
      </Button>
    </div>
  );
}

/**
 * Gravity Bounce Calculator Button Component
 *
 * Features:
 * - Gentle bounce animation on hover
 * - Physics-based bounce on click (launches up, bounces down)
 * - Maintains exact same visual appearance as original button
 * - High performance GSAP animations
 */
function GravityBounceCalculatorButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleMouseEnter = () => {
    if (!buttonRef.current || isAnimating) return;

    // Gentle bounce on hover
    gsap.to(buttonRef.current, {
      y: -8,
      duration: 0.4,
      ease: "power2.out",
      yoyo: true,
      repeat: 1,
    });
  };

  const handleMouseLeave = () => {
    if (!buttonRef.current || isAnimating) return;

    // Reset to original position
    gsap.to(buttonRef.current, {
      y: 0,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const handleClick = () => {
    if (!buttonRef.current || isAnimating) return;

    setIsAnimating(true);

    // Navigate immediately (don't wait for animation)
    navigate("/ddc-calculator");

    // Physics-based bounce animation plays as page loads
    const tl = gsap.timeline({
      onComplete: () => {
        setIsAnimating(false);
      },
    });

    // Launch up
    tl.to(buttonRef.current, {
      y: -60,
      duration: 0.4,
      ease: "power2.out",
    })
      // Fall down with gravity
      .to(buttonRef.current, {
        y: 0,
        duration: 0.5,
        ease: "bounce.out",
      });
  };

  useEffect(() => {
    const buttonElement = buttonRef.current;
    return () => {
      if (buttonElement) {
        gsap.killTweensOf(buttonElement);
      }
    };
  }, []);

  return (
    <Link
      to="/ddc-calculator"
      onClick={(e) => {
        e.preventDefault();
        handleClick();
      }}
    >
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className="gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Calculator className="h-4 w-4" />
        <span className="hidden sm:inline">Domain Calculator</span>
      </Button>
    </Link>
  );
}

/**
 * Header component with animated cycling text
 *
 * Features:
 * - Animated domain name cycling with shuffle effect
 * - "hosting" stays constant (anchor)
 * - Extension (.dev, .gg, .io) shuffles seamlessly
 * - Middle word (tool, info) typewriter effect
 * - Randomized feel with proper sequencing
 * - GSAP-powered smooth transitions
 */
export default function Header() {
  const { user, logout } = useAuth();
  const { openTerminal } = useTerminalStore();
  // Calculate user tier from level (no separate fetch needed)
  const userTier = user?.level ? getUserTier(user.level) : null;
  const userDisplayName = user ? getUserDisplayName(user) : "User";
  const userInitials = user ? getUserInitials(user) : "U";
  const userShortName = userDisplayName.split(/\s+/)[0] || userDisplayName;
  // Avatar is reactive to user changes - no local state needed
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const middleRef = useRef<HTMLSpanElement>(null);
  const extensionRef = useRef<HTMLSpanElement>(null);
  const currentVariationRef = useRef(0);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Actual live domains - alternating pattern to avoid info→info
  useEffect(() => {
    if (!middleRef.current || !extensionRef.current) return;

    let animationTimeout: NodeJS.Timeout;
    let isAnimating = false;

    // ToyFight-style smooth shuffle animation
    const shuffleAnimation = () => {
      // Prevent overlapping animations
      if (isAnimating) return;
      isAnimating = true;

      // Pick next variation that has DIFFERENT middle word
      const currentMiddle =
        HEADER_VARIATIONS[currentVariationRef.current].middle;
      const availableIndices = HEADER_VARIATIONS.map((_, i) => i).filter(
        (i) =>
          i !== currentVariationRef.current &&
          HEADER_VARIATIONS[i].middle !== currentMiddle,
      );

      // If no different middle word available, reschedule
      if (availableIndices.length === 0) {
        isAnimating = false;
        animationTimeout = setTimeout(shuffleAnimation, 6000);
        return;
      }

      const nextIndex =
        availableIndices[Math.floor(Math.random() * availableIndices.length)];
      const nextVariation = HEADER_VARIATIONS[nextIndex];

      // Create master timeline with ToyFight-style smoothness
      const tl = gsap.timeline({
        onComplete: () => {
          isAnimating = false;
          // Schedule next animation after completion
          const delay = 5000 + Math.random() * 3000; // 5-8 seconds
          animationTimeout = setTimeout(shuffleAnimation, delay);
        },
      });

      // PHASE 1: Extension slides out and changes (horizontal shuffle)
      tl.to(extensionRef.current, {
        x: 20,
        opacity: 0,
        duration: 0.4,
        ease: "power2.inOut",
      })
        .set(extensionRef.current, { textContent: nextVariation.extension })
        .to(extensionRef.current, {
          x: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power2.inOut",
        })

        // PHASE 2: Middle word fades out, changes, fades in (simple and smooth)
        .to(
          middleRef.current,
          {
            opacity: 0,
            duration: 0.3,
            ease: "power2.inOut",
          },
          "-=0.2",
        ) // Slight overlap with extension
        .set(middleRef.current, { textContent: nextVariation.middle })
        .to(middleRef.current, {
          opacity: 1,
          duration: 0.3,
          ease: "power2.inOut",
        });

      currentVariationRef.current = nextIndex;
    };

    // Initial animation on mount
    gsap.fromTo(
      [middleRef.current, extensionRef.current],
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: "power2.out", stagger: 0.1 },
    );

    // Start first animation after delay
    animationTimeout = setTimeout(shuffleAnimation, 6000);

    return () => {
      clearTimeout(animationTimeout);
      isAnimating = false;
    };
  }, []); // Remove currentVariation dependency to prevent re-triggering

  const closeMobileMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = () => {
    closeMobileMenu();
    logout();
    navigate("/");
  };

  return (
    <>
      <header className="relative z-50 bg-gradient-to-br from-purple-50/80 via-blue-50/60 to-white border-b border-purple-200/50 dark:from-muted/30 dark:via-muted/20 dark:to-background dark:border-border/40">
        <div className="container mx-auto px-4">
          <div className="flex h-20 items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-3 sm:gap-4 group transition-all duration-300"
            >
              {/* Logo with pop-out animation - High Quality G$ Emoji */}
              <div className="relative transition-all duration-500 ease-out group-hover:scale-125 group-hover:rotate-12 animate-pop-in will-change-transform">
                <img
                  src="/assets/placeholder.png"
                  alt="HostingInfo G$ Logo"
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                  style={{
                    imageRendering: "-webkit-optimize-contrast",
                    backfaceVisibility: "hidden",
                    transform: "translateZ(0)",
                    willChange: "transform",
                  }}
                  loading="eager"
                  decoding="async"
                />
                {/* Purple glow effect - only visible on hover */}
                <div className="absolute inset-0 bg-purple-500/40 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 dark:bg-primary/30 dark:blur-xl" />
              </div>

              {/* Domain Name - Shuffle animation: "hosting" stays, middle + extension shuffle */}
              {/* CACHE BUSTER: v2.0 - Fixed Windows color rendering */}
              <div
                className="text-xl sm:text-2xl font-bold"
                style={{ lineHeight: "1.4" }}
              >
                <span
                  className="will-change-transform dark:opacity-90"
                  style={{
                    display: "inline-block",
                    background:
                      "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                    paddingBottom: "0.1em",
                    filter: "drop-shadow(0 2px 8px rgba(59, 130, 246, 0.3))",
                  }}
                >
                  hosting
                </span>
                <span
                  ref={middleRef}
                  className="will-change-transform dark:opacity-90"
                  style={{
                    display: "inline-block",
                    perspective: "1000px",
                    background:
                      "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                    paddingBottom: "0.1em",
                    filter: "drop-shadow(0 2px 8px rgba(59, 130, 246, 0.3))",
                  }}
                >
                  tool
                </span>
                <span
                  ref={extensionRef}
                  className="will-change-transform dark:opacity-90"
                  style={{
                    display: "inline-block",
                    background:
                      "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                    paddingBottom: "0.1em",
                    filter: "drop-shadow(0 2px 8px rgba(59, 130, 246, 0.3))",
                  }}
                >
                  .dev
                </span>
              </div>
            </Link>

            {/* Navigation & Auth Section */}
            <div className="hidden md:flex items-center gap-3">
              {/* Domain Calculator Link with Gravity Bounce Effect */}
              <GravityBounceCalculatorButton />

              {/* Intelligence Dashboard Link - Only visible when logged in */}
              {user && (
                <Link to="/intelligence">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="group gap-2 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-100 dark:text-cyan-400 dark:hover:text-cyan-300 dark:hover:bg-cyan-900/20"
                  >
                    <Layers className="h-4 w-4 layers-icon-hover" />
                    <span className="hidden sm:inline">Intelligence</span>
                  </Button>
                </Link>
              )}

              {/* Web Archives Link */}
              <Link to="/archives">
                <Button
                  variant="ghost"
                  size="sm"
                  className="group gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                >
                  <Archive className="h-4 w-4 archive-icon-wave-float" />
                  <span className="hidden sm:inline">Web Archives</span>
                </Button>
              </Link>

              {/* Leaderboard Link - Always visible */}
              <Link to="/leaderboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 relative group"
                >
                  <AnimatedFlameIcon className="h-4 w-4" useParentHover />
                  <span className="hidden sm:inline font-semibold">
                    Leaderboard
                  </span>
                </Button>
              </Link>

              {/* Guide link removed - now a tile on dashboard */}

              {/* Minimal Elegant Dashboard Button - Only visible when logged in */}
              {user && (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 transition-all duration-300 hover:bg-primary/20 hover:border-primary/40 hover:shadow-lg overflow-hidden min-w-[120px] justify-center"
                >
                  {/* Subtle glow */}
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 rounded-lg transition-colors duration-300" />

                  {/* Content */}
                  <div className="relative flex items-center gap-2 text-primary font-medium text-sm">
                    <LayoutDashboard className="h-4 w-4 transition-all duration-300 group-hover:scale-110" />
                    <span className="hidden md:inline">Dashboard</span>
                  </div>

                  {/* Underline effect - absolutely positioned to not affect layout */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
                </button>
              )}

              {user?.isAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 transition-all duration-300 hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:shadow-lg overflow-hidden min-w-[110px] justify-center"
                >
                  <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/5 rounded-lg transition-colors duration-300" />
                  <div className="relative flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-medium text-sm">
                    <Shield className="h-4 w-4 transition-all duration-300 group-hover:scale-110" />
                    <span className="hidden md:inline">Admin</span>
                  </div>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] h-0.5 bg-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
                </button>
              )}

              {user ? (
                // Logged in - show Premium Card user menu
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:scale-105 transition-transform duration-200"
                    >
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 border border-primary/20 hover:border-primary/40 transition-colors">
                        <div className="relative">
                          {/* Legendary Pulse Rings */}
                          {userTier?.name === "legendary" && (
                            <>
                              {/* Outer pulse ring */}
                              <motion.div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{
                                  border: `3px solid ${userTier.borderColor}`,
                                  filter: `drop-shadow(0 0 8px ${userTier.glowColor})`,
                                }}
                                animate={{
                                  scale: [1, 1.15, 1],
                                  opacity: [0.6, 0.3, 0.6],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              />
                              {/* Middle pulse ring */}
                              <motion.div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{
                                  border: `3px solid ${userTier.borderColor}`,
                                  filter: `drop-shadow(0 0 12px ${userTier.glowColor})`,
                                }}
                                animate={{
                                  scale: [1, 1.25, 1],
                                  opacity: [0.4, 0.1, 0.4],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: 0.3,
                                }}
                              />
                            </>
                          )}

                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              openTerminal();
                            }}
                            className="cursor-pointer"
                            title="Click to open HT Terminal 🔧"
                          >
                            <Avatar
                              className="h-8 w-8 relative transition-transform hover:scale-110"
                              style={{
                                border: `3px solid ${userTier?.borderColor || "#22c55e"}`,
                                boxShadow: `0 0 20px ${userTier?.glowColor || "rgba(34, 197, 94, 0.4)"}`,
                              }}
                            >
                              <AvatarImage
                                src={
                                  user.avatarImagePath ||
                                  "/avatars/default/shutterstock_2518667991_avatar_01.png"
                                }
                                alt={userDisplayName}
                              />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {userInitials}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-semibold">
                            {userShortName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Level {user.level || 1}
                          </span>
                        </div>
                        <Crown className="h-4 w-4 text-amber-500 ml-1" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 backdrop-blur-xl bg-background/95 border-border/50 shadow-2xl"
                  >
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {userDisplayName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate("/dashboard")}
                      className="group cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-medium">Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/account-settings")}
                      className="group cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                    >
                      <Settings className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                      <span className="font-medium">Account Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/change-avatar")}
                      className="group cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                    >
                      <ImageIcon className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-medium">Change Avatar</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/50" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="group cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                    >
                      <LogOut className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                      <span className="font-medium">Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Logged out - show Liquid Energy Fusion auth buttons
                <LiquidEnergyButtons />
              )}
            </div>

            <div className="md:hidden flex items-center">
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  menuOpen ? "Close navigation menu" : "Open navigation menu"
                }
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation-menu"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                {menuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div
            id="mobile-navigation-menu"
            className="md:hidden absolute top-full left-0 right-0 border-b border-border/40 bg-background/95 backdrop-blur z-50"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {user && (
                <div className="mb-2 flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={
                        user.avatarImagePath ||
                        "/avatars/default/shutterstock_2518667991_avatar_01.png"
                      }
                      alt={userDisplayName}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {userDisplayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Level {user.level || 1}
                    </p>
                  </div>
                </div>
              )}

              <Link to="/ddc-calculator" onClick={closeMobileMenu}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Calculator className="h-4 w-4" />
                  Domain Calculator
                </Button>
              </Link>

              {user && (
                <Link to="/intelligence" onClick={closeMobileMenu}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                  >
                    <Layers className="h-4 w-4" />
                    Intelligence
                  </Button>
                </Link>
              )}

              <Link to="/archives" onClick={closeMobileMenu}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Archive className="h-4 w-4" />
                  Web Archives
                </Button>
              </Link>

              <Link to="/leaderboard" onClick={closeMobileMenu}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <AnimatedFlameIcon className="h-4 w-4" />
                  Leaderboard
                </Button>
              </Link>

              {user ? (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      closeMobileMenu();
                      navigate("/dashboard");
                    }}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      closeMobileMenu();
                      navigate("/account-settings");
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </Button>
                  {user.isAdmin && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        closeMobileMenu();
                        navigate("/admin");
                      }}
                    >
                      <Shield className="h-4 w-4" />
                      Admin
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      closeMobileMenu();
                      navigate("/change-avatar");
                    }}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Change Avatar
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      closeMobileMenu();
                      navigate("/login");
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => {
                      closeMobileMenu();
                      navigate("/signup");
                    }}
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
