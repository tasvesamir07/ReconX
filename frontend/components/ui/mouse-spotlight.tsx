"use client";

import { useEffect, useState } from "react";

/**
 * Global Mouse Spotlight Glow.
 * Renders an ambient radiant Lime Green spotlight that smoothly tracks the user's cursor
 * across every page, card, and component in the application.
 *
 * Configured with pointer-events-none and z-30 so that it hovers cleanly over backgrounds
 * and dark cards without blocking any clicks or interactions.
 */
export function MouseSpotlight() {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Initialize spotlight at screen center so there's an immediate soft ambient aura
    if (typeof window !== "undefined") {
      setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2.5 });
      setActive(true);
    }

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!active) setActive(true);
    };

    const handleMouseLeave = () => {
      // Park spotlight softly at top-center when cursor leaves the window
      if (typeof window !== "undefined") {
        setPos({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [active]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 ease-out"
      style={{
        opacity: active ? 1 : 0,
        background: `radial-gradient(650px circle at ${pos.x}px ${pos.y}px, rgba(198, 244, 50, 0.22), rgba(198, 244, 50, 0.06) 40%, transparent 72%)`,
      }}
      aria-hidden="true"
    />
  );
}
