import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SketchIcon } from "@/components/SketchIcon";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";
import gsap from "gsap";
import {
  ChevronRight,
  ChevronLeft,
  Play,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Search,
  Calculator,
  Star,
} from "lucide-react";

interface GuideStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode | string; // Allow string for special cases like 'welcome-video'
  features: string[];
  requiresAccount?: boolean;
  demoAction?: string;
  color: string;
}

const guideSteps: GuideStep[] = [
  {
    id: 1,
    title: "Welcome to Hosting Tool",
    description:
      "Scan websites, check performance, and calculate domain costs.",
    icon: "welcome-video", // Special flag for video display
    features: [
      "Website scanning",
      "Performance monitoring",
      "Security checks",
      "Domain cost calculator",
      "Domain dashboard",
    ],
    color: "from-purple-500 to-pink-500",
  },
  {
    id: 2,
    title: "Quick Domain Scan",
    description: "Scan any domain instantly. No account required.",
    icon: <SketchIcon type="search" className="h-12 w-12" />,
    features: [
      "Enter any domain name",
      "Performance scores",
      "Platform Swap & Migration Info",
      "WHOIS information",
      "Technology stack",
    ],
    demoAction: "Try scanning a domain",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: 3,
    title: "Performance Analysis",
    description: "Check website speed with Google PageSpeed Insights.",
    icon: <SketchIcon type="zap" className="h-12 w-12" />,
    features: [
      "Mobile & Desktop scores",
      "Core Web Vitals (FCP, LCP, TBT, CLS)",
      "Speed Index",
      "Multi-page scanning",
      "Performance history",
    ],
    color: "from-yellow-500 to-orange-500",
  },
  {
    id: 4,
    title: "Security Scanning",
    description: "Check for security issues and vulnerabilities.",
    icon: <SketchIcon type="shield" className="h-12 w-12" />,
    features: [
      "SSL certificate check",
      "Security headers",
      "Malware detection",
      "Vulnerability scan",
      "Email security (SPF, DKIM, DMARC)",
    ],
    color: "from-green-500 to-emerald-500",
  },
  {
    id: 5,
    title: "Domain Calculator",
    description:
      "Calculate domain registration and renewal costs for 555+ extensions.",
    icon: <SketchIcon type="calculator" className="h-12 w-12" />,
    features: [
      "555+ domain extensions",
      "Registration costs",
      "Renewal pricing",
      "Multi-year calculations",
    ],
    demoAction: "Try the calculator",
    color: "from-indigo-500 to-purple-500",
  },
  {
    id: 6,
    title: "Create an Account",
    description: "Sign up for free to access more features.",
    icon: <SketchIcon type="user-plus" className="h-12 w-12" />,
    features: [
      "Save favorite domains",
      "Track scan history",
      "Set up monitoring alerts",
      "Earn XP and achievements",
    ],
    requiresAccount: true,
    demoAction: "Sign up now",
    color: "from-pink-500 to-rose-500",
  },
  {
    id: 7,
    title: "Favorites & Quick Access",
    description: "Save domains you scan often for quick access.",
    icon: <SketchIcon type="star" className="h-12 w-12" />,
    features: [
      "Add custom aliases",
      "Add notes",
      "Quick scan buttons",
      "View scan history",
      "Track scan counts",
    ],
    requiresAccount: true,
    color: "from-amber-500 to-yellow-500",
  },
  {
    id: 8,
    title: "Domain Dashboard",
    description: "Monitor your clients' websites in one place.",
    icon: <SketchIcon type="chart" className="h-12 w-12" />,
    features: [
      "Overview statistics",
      "Performance trends",
      "Security alerts",
      "Domain filtering",
      "Historical charts",
    ],
    requiresAccount: true,
    color: "from-cyan-500 to-blue-500",
  },
  {
    id: 9,
    title: "Monitoring & Alerts",
    description: "Set up automated monitoring and get notified about changes.",
    icon: <SketchIcon type="bell" className="h-12 w-12" />,
    features: [
      "Daily automated scans",
      "Email notifications",
      "Performance alerts",
      "Security alerts",
      "Downtime detection",
    ],
    requiresAccount: true,
    color: "from-red-500 to-pink-500",
  },
  {
    id: 10,
    title: "Leveling System",
    description: "Earn XP and unlock achievements as you scan domains.",
    icon: <SketchIcon type="trending" className="h-12 w-12" />,
    features: [
      "Earn XP for scans",
      "Level up your profile",
      "Unlock achievements",
      "Track your progress",
      "Anonymous leaderboard",
    ],
    requiresAccount: true,
    color: "from-emerald-500 to-green-500",
  },
  {
    id: 11,
    title: "Ready to Get Started?",
    description:
      "Start scanning domains or create an account for more features.",
    icon: <SketchIcon type="check" className="h-12 w-12" />,
    features: [
      "Scan any domain instantly",
      "Create a free account",
      "Explore the dashboard",
      "Try the domain calculator",
      "Save favorite domains",
    ],
    demoAction: "Create an account",
    color: "from-blue-500 to-indigo-500",
  },
];

export default function GuidePage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  const step = guideSteps[currentStep];

  useEffect(() => {
    animateStepTransition();
  }, [currentStep]);

  const animateStepTransition = () => {
    if (
      !cardRef.current ||
      !contentRef.current ||
      !featuresRef.current ||
      !iconRef.current
    )
      return;

    // Optimized timeline with hardware acceleration
    const tl = gsap.timeline({ defaults: { force3D: true } });

    // Animate out old content (faster)
    tl.to(contentRef.current, {
      opacity: 0,
      y: -15,
      duration: 0.2,
      ease: "power2.in",
    });

    // Animate card scale (subtle)
    tl.to(
      cardRef.current,
      {
        scale: 0.98,
        duration: 0.15,
        ease: "power2.inOut",
      },
      "<",
    );

    // Animate in new content (faster)
    tl.to(contentRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.3,
      ease: "power2.out",
    });

    tl.to(
      cardRef.current,
      {
        scale: 1,
        duration: 0.25,
        ease: "back.out(1.5)",
      },
      "<",
    );

    // Animate icon (faster, smoother)
    tl.fromTo(
      iconRef.current,
      { scale: 0, rotation: -90 },
      {
        scale: 1,
        rotation: 0,
        duration: 0.4,
        ease: "back.out(1.7)",
      },
      "-=0.25",
    );

    // Stagger features (faster)
    const features = featuresRef.current.children;
    tl.fromTo(
      features,
      { opacity: 0, x: -15 },
      {
        opacity: 1,
        x: 0,
        duration: 0.25,
        stagger: 0.06,
        ease: "power2.out",
      },
      "-=0.3",
    );
  };

  const nextStep = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);
  };

  const handleDemoAction = () => {
    if (step.id === 2 || step.id === 12) {
      navigate("/");
    } else if (step.id === 5) {
      navigate("/ddc-calculator");
    } else if (step.id === 6 || step.id === 11) {
      // Both "Create an Account" step and "Ready to Get Started" link to signup
      navigate("/login");
    }
  };

  const startAutoPlay = () => {
    setIsPlaying(true);
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= guideSteps.length - 1) {
          setIsPlaying(false);
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 5000);
  };

  return (
    <>
      <SEOHead
        title={PAGE_META.guide.title}
        description={PAGE_META.guide.description}
        keywords={PAGE_META.guide.keywords}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="relative bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Back Button + Title */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                <div className="h-8 w-px bg-border" />

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Hosting Info Guide
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          {/* Progress Bar */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {guideSteps.length}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-500 ease-out"
                style={{
                  width: `${((currentStep + 1) / guideSteps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Main Card */}
          <div className="max-w-4xl mx-auto mb-8">
            <Card ref={cardRef} className="overflow-hidden border-2">
              <div className={`h-2 bg-gradient-to-r ${step.color}`} />
              <CardHeader className="text-center pb-4">
                {/* Special handling for welcome video */}
                {step.icon === "welcome-video" ? (
                  <div ref={iconRef} className="mx-auto mb-6 max-w-lg">
                    <ParticleOrbitEffect />
                  </div>
                ) : (
                  <div
                    ref={iconRef}
                    className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${step.color} text-white mx-auto mb-4 shadow-lg`}
                  >
                    {step.icon}
                  </div>
                )}
                <CardTitle className="text-3xl mb-2">{step.title}</CardTitle>
                <CardDescription className="text-lg">
                  {step.description}
                </CardDescription>
                {step.requiresAccount && (
                  <Badge variant="secondary" className="mt-2">
                    <Lock className="h-3 w-3 mr-1" />
                    Requires Account
                  </Badge>
                )}
              </CardHeader>
              <CardContent ref={contentRef}>
                <div ref={featuresRef} className="space-y-3 mb-6">
                  {step.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                {step.demoAction && (
                  <Button
                    onClick={handleDemoAction}
                    className="w-full"
                    size="lg"
                  >
                    {step.demoAction}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Navigation */}
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <Button
              onClick={prevStep}
              disabled={currentStep === 0}
              variant="outline"
              size="lg"
              className="flex-1 max-w-xs"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {!isPlaying && currentStep === 0 && (
              <Button onClick={startAutoPlay} variant="secondary" size="lg">
                <Play className="mr-2 h-4 w-4" />
                Auto Play
              </Button>
            )}

            <Button
              onClick={nextStep}
              disabled={currentStep === guideSteps.length - 1}
              size="lg"
              className="flex-1 max-w-xs"
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Step Dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {guideSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Quick Links */}
          <div className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate("/")}
            >
              <CardHeader>
                <Search className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Start Scanning</CardTitle>
                <CardDescription>Scan any domain instantly</CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate("/ddc-calculator")}
            >
              <CardHeader>
                <Calculator className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Domain Calculator</CardTitle>
                <CardDescription>Calculate domain costs</CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate("/signup")}
            >
              <CardHeader>
                <Star className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Create Account</CardTitle>
                <CardDescription>Unlock all features</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

// Particle Orbit Effect Component
function ParticleOrbitEffect() {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 600;

    const particles: Array<{
      angle: number;
      radius: number;
      speed: number;
      size: number;
      color: string;
    }> = [];

    // Create particles
    for (let i = 0; i < 30; i++) {
      particles.push({
        angle: (Math.PI * 2 * i) / 30,
        radius: 200 + Math.random() * 50,
        speed: 0.01 + Math.random() * 0.02,
        size: 2 + Math.random() * 3,
        color: `hsl(${270 + Math.random() * 60}, 80%, 60%)`,
      });
    }

    let animationId: number;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      particles.forEach((particle) => {
        particle.angle += particle.speed;

        const x = centerX + Math.cos(particle.angle) * particle.radius;
        const y = centerY + Math.sin(particle.angle) * particle.radius;

        // Draw particle
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();

        // Draw trail
        const trailX =
          centerX + Math.cos(particle.angle - 0.5) * particle.radius;
        const trailY =
          centerY + Math.sin(particle.angle - 0.5) * particle.radius;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(trailX, trailY);
        ctx.strokeStyle = particle.color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = particle.size / 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md mx-auto">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ transform: "translate(-50%, -50%)", left: "50%", top: "50%" }}
      />
      <img
        ref={imageRef}
        src="/assets/placeholder.png"
        alt="Welcome to Hosting Tool"
        className="w-full h-auto rounded-lg relative z-10"
      />
    </div>
  );
}
