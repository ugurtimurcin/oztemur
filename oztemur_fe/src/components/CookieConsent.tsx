"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

const COOKIE_NAME = "oz_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax${secure}`;
}

export interface ConsentContent {
  title: string;
  body: string;
  accept: string;
  learnMore: string;
}

/**
 * First-visit cookie consent banner. Hidden once the visitor accepts —
 * acceptance stored in oz_consent cookie (1 year). Renders nothing on
 * the server to keep SSR HTML clean and avoid a hydration flash.
 */
export default function CookieConsent({ content }: { content: ConsentContent }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readCookie(COOKIE_NAME)) setVisible(true);
  }, []);

  const accept = () => {
    writeCookie(COOKIE_NAME, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-4 start-4 end-4 md:start-6 md:end-auto md:bottom-6 md:max-w-md z-[150] bg-midnight text-ivory border border-champagne/30 shadow-[0_24px_60px_rgba(10,26,47,0.4)] p-6 md:p-7"
    >
      <div className="flex items-start gap-4">
        <Icon name="cookie" className="text-champagne text-2xl flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg text-ivory mb-2">{content.title}</h3>
          <p className="text-ivory/75 font-light text-sm leading-relaxed mb-5">{content.body}</p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={accept}
              className="inline-flex items-center gap-2 bg-champagne text-midnight px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] hover:bg-champagne-bright transition-colors"
            >
              {content.accept}
            </button>
            <Link
              href="/kvkk"
              className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/70 hover:text-champagne transition-colors pb-1 border-b border-ivory/30 hover:border-champagne"
            >
              {content.learnMore}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
