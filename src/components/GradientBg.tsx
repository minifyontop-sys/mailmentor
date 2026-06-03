"use client";

import { cn } from "@/lib/utils";

/**
 * Static warm background — a single radial wash in warm gold, plus a faint
 * noise overlay. No animation, no glow, no aurora blobs.
 */
export function GradientBg({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, hsl(36 50% 25% / 0.10), transparent 70%), radial-gradient(ellipse 60% 50% at 90% 100%, hsl(20 50% 18% / 0.06), transparent 70%), hsl(30 6% 9%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundSize: "160px 160px",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
