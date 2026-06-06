"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useUiString } from "@/lib/SiteContentContext";

interface ShareBarProps {
  title: string;
  /** Optional summary used by the native share sheet (ignored elsewhere). */
  summary?: string;
  /**
   * Absolute or path-only URL of the page being shared. Leave empty to
   * derive from <c>window.location.href</c> at click time — that's what
   * we want for SSR-rendered pages whose URL the server doesn't know.
   */
  url?: string;
  /** "compact" = 40×40 buttons for sidebars; "expanded" = 44×44 for inline rows. */
  variant?: "compact" | "expanded";
}

/**
 * Reusable social/native share row used by article-style detail pages.
 * Renders four explicit actions (copy link, email, LinkedIn, WhatsApp)
 * plus a fifth "system share sheet" button on devices that expose the
 * Web Share API (almost always mobile). The native button is feature-
 * detected after mount so SSR output matches the first client render.
 */
export default function ShareBar({ title, summary, url, variant = "compact" }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  const copyLabel     = useUiString("share.copy_link", "Copy link");
  const copiedLabel   = useUiString("share.copied",    "Link copied");
  const emailLabel    = useUiString("share.email",     "Send by email");
  const linkedinLabel = useUiString("share.linkedin",  "Share on LinkedIn");
  const whatsappLabel = useUiString("share.whatsapp",  "Share on WhatsApp");
  const nativeLabel   = useUiString("share.native",    "Share");

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setHasNativeShare(true);
    }
  }, []);

  // Buttons are the same physical size in both variants; only outer gap differs.
  const size = variant === "expanded" ? "w-11 h-11" : "w-10 h-10";

  const resolveUrl = () => {
    if (url) return url;
    return typeof window !== "undefined" ? window.location.href : "";
  };

  const onCopy = async () => {
    const u = resolveUrl();
    if (!u) return;
    try {
      await navigator.clipboard.writeText(u);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard unavailable (HTTP, old browser) — fall back to selecting
      // a hidden input. Silent rather than throwing: paylaş button bozulmasın.
      try {
        const ta = document.createElement("textarea");
        ta.value = u;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      } catch {
        /* give up silently */
      }
    }
  };

  const onNative = async () => {
    const u = resolveUrl();
    if (!u || typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    try {
      await navigator.share({ title, text: summary, url: u });
    } catch {
      // User dismissed the sheet or the browser refused; nothing to do.
    }
  };

  // Build hrefs lazily at render — these are safe to recompute on each
  // render and don't depend on click-time state.
  const u = resolveUrl();
  const mailHref =
    `mailto:?subject=${encodeURIComponent(title)}` +
    `&body=${encodeURIComponent(`${title}\n\n${u}`)}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${title} — ${u}`)}`;

  const btnClass =
    `${size} border border-border hover:border-champagne hover:text-champagne ` +
    `flex items-center justify-center transition-colors`;

  return (
    <div className="flex gap-2 items-center flex-wrap">
      {/* Copy link → checkmark feedback for 2s after success */}
      <button
        type="button"
        onClick={onCopy}
        title={copied ? copiedLabel : copyLabel}
        aria-label={copied ? copiedLabel : copyLabel}
        className={`${btnClass} ${copied ? "border-champagne text-champagne" : ""}`}
      >
        <Icon name={copied ? "check" : "link"} className="text-base" />
      </button>

      {/* Email — mailto: */}
      <a
        href={mailHref}
        title={emailLabel}
        aria-label={emailLabel}
        className={btnClass}
      >
        <Icon name="mail" className="text-base" />
      </a>

      {/* LinkedIn — opens in a new tab; rel guards against opener access */}
      <a
        href={linkedinHref}
        target="_blank"
        rel="noopener noreferrer"
        title={linkedinLabel}
        aria-label={linkedinLabel}
        className={btnClass}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-[18px] h-[18px]">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>

      {/* WhatsApp — wa.me deep link; renders the system app on mobile, web on desktop */}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        title={whatsappLabel}
        aria-label={whatsappLabel}
        className={btnClass}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-[18px] h-[18px]">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </a>

      {/* Native share sheet — only renders post-mount on devices that have it.
          Mostly relevant on mobile (iOS Safari + Android Chrome) where the
          system sheet covers every install app (Twitter, Telegram, AirDrop…). */}
      {hasNativeShare && (
        <button
          type="button"
          onClick={onNative}
          title={nativeLabel}
          aria-label={nativeLabel}
          className={btnClass}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-[18px] h-[18px]">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
          </svg>
        </button>
      )}
    </div>
  );
}
