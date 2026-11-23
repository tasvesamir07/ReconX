"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Global Mouse Spotlight Glow.
 * Renders an ambient radiant Lime Green spotlight that smoothly tracks the user's cursor
 * across every page, card, and component in the application.
 *
 * Uses direct DOM manipulation on pointermove for ultra-smooth 60-120fps hardware-accelerated tracking
 * without incurring React state re-render overhead.
 */
export function MouseSpotlight() {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const updatePosition = (x: number, y: number) => {
      if (spotlightRef.current) {
        spotlightRef.current.style.opacity = "1";
        spotlightRef.current.style.background = `radial-gradient(750px circle at ${x}px ${y}px, rgba(198, 244, 50, 0.28) 0%, rgba(198, 244, 50, 0.09) 38%, rgba(198, 244, 50, 0.02) 65%, transparent 75%)`;
      }
    };

    // Center spotlight initially on load
    if (typeof window !== "undefined") {
      updatePosition(window.innerWidth / 2, window.innerHeight / 2.8);
    }

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      updatePosition(e.clientX, e.clientY);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("mousemove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mousemove", handlePointerMove);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={spotlightRef}
      className="pointer-events-none fixed inset-0 z-20 transition-opacity duration-300 ease-out"
      style={{
        opacity: 1,
        background: `radial-gradient(750px circle at 50% 35%, rgba(198, 244, 50, 0.28) 0%, rgba(198, 244, 50, 0.09) 38%, rgba(198, 244, 50, 0.02) 65%, transparent 75%)`,
      }}
      aria-hidden="true"
    />
  );
}
