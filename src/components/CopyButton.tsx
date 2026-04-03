"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-8 px-2 relative overflow-hidden group hover:scale-110 hover:shadow-lg transition-all duration-300 active:scale-95"
    >
      {/* Shimmer effect */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-500 animate-in zoom-in duration-300" />
          <span className="ml-1 text-xs animate-in fade-in duration-300">
            Copied!
          </span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 group-hover:rotate-12 group-hover:scale-125 transition-transform duration-300" />
          <span className="ml-1 text-xs">{label}</span>
        </>
      )}
    </Button>
  );
}
