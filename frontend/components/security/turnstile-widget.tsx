"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
}

/**
 * Cloudflare Turnstile. Renders nothing when no site key is configured, so
 * local development and tests keep working without a CAPTCHA provider.
 */
export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onToken);
  callbackRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return;

    let widgetId: string | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const render = () => {
      if (cancelled || widgetId || !window.turnstile || !containerRef.current) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: "light",
        callback: (token) => callbackRef.current(token),
        "error-callback": () => callbackRef.current(null),
        "expired-callback": () => callbackRef.current(null),
      });
    };

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (!existing) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    if (window.turnstile) {
      render();
    } else {
      pollTimer = setInterval(render, 250);
    }

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // The widget may already be detached.
        }
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className="flex justify-center py-1" />;
}
