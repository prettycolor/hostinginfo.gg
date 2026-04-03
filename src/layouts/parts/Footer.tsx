import { Link } from "react-router-dom";
import { useTerminalStore } from "@/lib/terminal/terminal-store";

/**
 * Footer component for website
 *
 * A simple, customizable footer with copyright and links.
 * This component is designed to be directly edited by the AI agent
 * to match the specific needs of each website.
 */
export default function Footer() {
  const { openTerminal } = useTerminalStore();
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {/* HostingInfo Logo */}
            <img
              src="/assets/placeholder.png"
              alt="HostingInfo Logo"
              className="h-12 w-12 transition-all duration-300 hover:scale-125 hover:rotate-6 cursor-pointer"
              style={{
                imageRendering: "-webkit-optimize-contrast",
              }}
              onClick={(e) => {
                e.preventDefault();
                openTerminal();
              }}
              title="Click to open HT Terminal 🔧"
            />
            <span>
              Created by the{" "}
              <a
                href="https://github.com/prettycolor/hostinginfo.gg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline transition-colors"
              >
                hostinginfo.gg
              </a>{" "}
              contributors
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link
              to="/privacy"
              className="text-primary hover:underline transition-colors"
            >
              Privacy Policy
            </Link>
            <span>•</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                openTerminal();
              }}
              className="text-primary hover:underline transition-colors cursor-pointer"
              title="Click to open HT Terminal 🔧"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
