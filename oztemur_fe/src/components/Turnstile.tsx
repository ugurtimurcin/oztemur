"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

/**
 * Cloudflare Turnstile widget. Reports its verification token to the
 * parent via `onVerify`. The site key comes from
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY; if empty, the component renders
 * nothing (verification disabled — must mirror backend config).
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "flexible" | "compact";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
let scriptLoaded = false;

export default function Turnstile({
  onVerify,
  theme = "light",
}: {
  onVerify: (token: string) => void;
  theme?: "light" | "dark" | "auto";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    if (!containerRef.current) return;

    const tryRender = () => {
      if (!window.turnstile || !containerRef.current) return false;
      // Avoid duplicate render in StrictMode / fast refresh
      if (widgetIdRef.current) return true;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme,
        callback: (token: string) => onVerify(token),
        "error-callback": () => onVerify(""),
        "expired-callback": () => onVerify(""),
      });
      return true;
    };

    if (!tryRender()) {
      // Script may not have loaded yet — poll briefly.
      const interval = setInterval(() => {
        if (tryRender()) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, theme]);

  if (!SITE_KEY) return null;

  return (
    <>
      {!scriptLoaded && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          onLoad={() => { scriptLoaded = true; }}
        />
      )}
      <div ref={containerRef} className="cf-turnstile" />
    </>
  );
}
