"use client";

import { useEffect } from "react";
import { warmBackend } from "@/lib/api-client";

/**
 * BackendWarmer triggers only on-demand:
 * 1. The moment the frontend is loaded by a user.
 * 2. When the user switches back to this active tab.
 * Does NOT run background periodic cron pings to preserve Render free hours and bandwidth.
 */
export function BackendWarmer() {
  useEffect(() => {
    // 1. Initial on-demand pre-warm when the visitor loads the site
    warmBackend();

    // 2. Pre-warm when user focuses back on the tab
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        warmBackend();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
