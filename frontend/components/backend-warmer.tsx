"use client";

import { useEffect } from "react";
import { warmBackend } from "@/lib/api-client";

/**
 * BackendWarmer keeps the Render free-tier backend awake and pre-warms it
 * the millisecond any visitor lands on any page.
 * Also runs an 8-minute heartbeat so the instance does not spin down while
 * the user has the browser tab open.
 */
export function BackendWarmer() {
  useEffect(() => {
    // 1. Initial immediate pre-warm
    warmBackend();

    // 2. Pre-warm when user switches back to this tab
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        warmBackend();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 3. Heartbeat every 8 minutes (Render spins down after 15m)
    const intervalId = setInterval(() => {
      warmBackend();
    }, 8 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(intervalId);
    };
  }, []);

  return null;
}
