"use client";

import { useEffect, useState } from "react";

/**
 * High-performance global mouse-following spotlight glow.
 * Renders an ambient radial Lime Green beam that follows the user's cursor across
 * every page in the application (Landing, Login, Register, Dashboard, etc.).
 */
export function MouseSpotlight() {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Set initial position to center of screen so there's an immediate soft ambient presence
    if (typeof window !== "undefined") {
      setPos({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
      setActive(true);
    }

    const handlePointerMove = (e: PointerEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!active) setActive(true);
    };

    const handleMouseLeave = () => {
      // Softly park the spotlight at center-top when mouse leaves the viewport
      if (typeof window !== "undefined") {
        setPos({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.body.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [active]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300 ease-out"
      style={{
        opacity: active ? 1 : 0,
        background: `radial-gradient(700px circle at ${pos.x}px ${pos.y}px, rgba(198, 244, 50, 0.20), rgba(198, 244, 50, 0.06) 40%, transparent 75%)`,
      }}
      aria-hidden="true"
    />
  );
}
