import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SecurityTooltipProps {
  term: string;
  className?: string;
}

const securityDefinitions: Record<
  string,
  {
    title: string;
    description: string;
    why: string;
    products?: string[];
    learnMore?: string;
  }
> = {
  hsts: {
    title: "HTTP Strict Transport Security (HSTS)",
    description:
      "Forces browsers to only connect to your site over HTTPS, preventing downgrade attacks.",
    why: "Protects users from man-in-the-middle attacks by ensuring all connections are encrypted.",
    products: ["Cloudflare", "AWS CloudFront", "Nginx", "Apache"],
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security",
  },
  csp: {
    title: "Content Security Policy (CSP)",
    description:
      "Controls which resources (scripts, styles, images) can be loaded on your site.",
    why: "Prevents XSS attacks by blocking malicious scripts from running on your pages.",
    products: ["Cloudflare", "Report URI", "CSP Evaluator"],
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP",
  },
  "x-frame-options": {
    title: "X-Frame-Options",
    description:
      "Prevents your site from being embedded in iframes on other domains.",
    why: "Protects against clickjacking attacks where attackers trick users into clicking hidden elements.",
    products: ["Most web servers support this natively"],
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options",
  },
  "x-content-type-options": {
    title: "X-Content-Type-Options",
    description:
      "Prevents browsers from MIME-sniffing responses away from the declared content-type.",
    why: "Stops browsers from interpreting files as a different type than declared, preventing certain attacks.",
    products: ["Most web servers support this natively"],
    learnMore:
      "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options",
  },
  coop: {
    title: "Cross-Origin-Opener-Policy (COOP)",
    description:
      "Isolates your browsing context from cross-origin windows.",
    why: "Prevents cross-origin attacks like Spectre by isolating your site's process.",
    products: ["Modern web servers", "Cloudflare"],
    learnMore:
      "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy",
  },
  coep: {
    title: "Cross-Origin-Embedder-Policy (COEP)",
    description:
      "Prevents loading cross-origin resources that don't explicitly grant permission.",
    why: "Required for using powerful features like SharedArrayBuffer safely.",
    products: ["Modern web servers", "Cloudflare"],
    learnMore:
      "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy",
  },
  corp: {
    title: "Cross-Origin-Resource-Policy (CORP)",
    description:
      "Controls which sites can load your resources (images, scripts, etc.).",
    why: "Protects your resources from being loaded by malicious cross-origin sites.",
    products: ["Modern web servers", "CDNs"],
    learnMore:
      "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy",
  },
  "referrer-policy": {
    title: "Referrer Policy",
    description:
      "Controls how much referrer information is sent with requests.",
    why: "Prevents leaking sensitive URL information to third-party sites.",
    products: ["Most web servers support this natively"],
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy",
  },
  "permissions-policy": {
    title: "Permissions Policy",
    description:
      "Controls which browser features and APIs can be used on your site.",
    why: "Limits access to sensitive features like camera, microphone, and geolocation.",
    products: ["Modern web servers"],
    learnMore:
      "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy",
  },
  ssl: {
    title: "SSL/TLS Certificate",
    description:
      "Encrypts data transmitted between your server and users' browsers.",
    why: "Essential for protecting sensitive data like passwords, credit cards, and personal information.",
    products: ["Let's Encrypt (Free)", "DigiCert", "Cloudflare", "AWS Certificate Manager"],
    learnMore: "https://letsencrypt.org/",
  },
  tls: {
    title: "TLS Protocol Version",
    description:
      "The encryption protocol version used for secure connections.",
    why: "Newer versions (TLS 1.3) are faster and more secure than older versions (TLS 1.0, 1.1).",
    products: ["Update your web server", "Cloudflare", "AWS"],
    learnMore: "https://en.wikipedia.org/wiki/Transport_Layer_Security",
  },
  cookies: {
    title: "Cookie Security Flags",
    description:
      "Security attributes that protect cookies from being stolen or misused.",
    why: "Secure, HttpOnly, and SameSite flags prevent cookie theft and CSRF attacks.",
    products: ["Configure in your application code"],
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies",
  },
  waf: {
    title: "Web Application Firewall (WAF)",
    description:
      "Filters and monitors HTTP traffic to protect against common web attacks.",
    why: "Blocks SQL injection, XSS, DDoS, and other attacks before they reach your server.",
    products: [
      "Cloudflare WAF",
      "AWS WAF",
      "Sucuri",
      "Wordfence (WordPress)",
      "Imperva",
      "Akamai",
    ],
    learnMore: "https://www.cloudflare.com/learning/ddos/glossary/web-application-firewall-waf/",
  },
  ddos: {
    title: "DDoS Protection",
    description:
      "Protects your site from Distributed Denial of Service attacks.",
    why: "Prevents attackers from overwhelming your server with traffic and taking your site offline.",
    products: ["Cloudflare", "AWS Shield", "Akamai", "Imperva"],
    learnMore: "https://www.cloudflare.com/learning/ddos/what-is-a-ddos-attack/",
  },
  "security-score": {
    title: "Security Score Breakdown",
    description:
      "Comprehensive score based on headers (50%), SSL/TLS (30%), cookies (15%), and WAF bonus (5%).",
    why: "Provides an overall assessment of your site's security posture.",
    products: ["Implement recommended security headers", "Enable HTTPS", "Add a WAF"],
  },
};

export function SecurityTooltip({ term, className }: SecurityTooltipProps) {
  const info = securityDefinitions[term.toLowerCase()];

  if (!info) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={`inline-flex items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-all duration-300 ${className || ""}`}
            aria-label={`Learn more about ${info.title}`}
          >
            <HelpCircle className="h-4 w-4 text-primary" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-sm p-5 space-y-3 bg-card border shadow-lg"
        >
          <div>
            <h4 className="font-semibold text-sm mb-1">{info.title}</h4>
            <p className="text-xs text-muted-foreground">{info.description}</p>
          </div>

          <div>
            <p className="text-xs font-medium mb-1">Why it matters:</p>
            <p className="text-xs text-muted-foreground">{info.why}</p>
          </div>

          {info.products && info.products.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Solutions:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {info.products.map((product, idx) => (
                  <li key={idx}>• {product}</li>
                ))}
              </ul>
            </div>
          )}

          {info.learnMore && (
            <a
              href={info.learnMore}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-block"
            >
              Learn more →
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
