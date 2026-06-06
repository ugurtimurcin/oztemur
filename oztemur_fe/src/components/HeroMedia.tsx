import Image from "next/image";
import { getMediaUrl } from "@/lib/api";

const VIDEO_RE = /\.(mp4|webm|mov|ogv|m4v)(\?.*)?$/i;

/**
 * Renders admin-uploaded hero media (image or video) on top of the
 * existing gradient/background. Detects video by file extension and
 * uses <video autoplay muted loop> for backgrounds; otherwise <img>
 * with the same ken-burns animation as the hardcoded fallbacks.
 *
 * Caller pattern:
 *   <div className="absolute inset-0">
 *     <fallback image / gradient />
 *     <HeroMedia src={section.heroMedia} active={section.heroMediaActive} />
 *   </div>
 *
 * When active === "true" and src is non-empty, the uploaded media is
 * rendered on top of the fallback. Otherwise null (fallback shows
 * through).
 */
export default function HeroMedia({
  src,
  active,
  className = "",
  overlay = true,
}: {
  src: string | undefined;
  active: string | undefined;
  className?: string;
  /** Render the standard gradient overlay on top of the media. */
  overlay?: boolean;
}) {
  if (!src || src.length === 0) return null;
  if (active !== "true") return null;

  const isVideo = VIDEO_RE.test(src);
  const resolvedSrc = getMediaUrl(src);

  return (
    <>
      {isVideo ? (
        <video
          src={resolvedSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className={`absolute inset-0 w-full h-full object-cover ${className}`}
        />
      ) : (
        <Image
          alt=""
          aria-hidden
          src={resolvedSrc}
          fill
          sizes="100vw"
          className={`object-cover animate-ken-burns ${className}`}
        />
      )}
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/55 to-midnight/20" />
      )}
    </>
  );
}

/**
 * Inline content media (story image, leadership portrait). When the
 * admin uploads + activates a custom image/video, it REPLACES the
 * hardcoded fallback. Otherwise the fallback renders unchanged.
 *
 * Designed for elements inside an aspect-ratio container, e.g.:
 *   <div className="aspect-[4/3] overflow-hidden bg-midnight">
 *     <ManagedMedia src={section.storyImage} active={section.storyImageActive}
 *       fallbackSrc="/images/construction_demo.png"
 *       className="w-full h-full object-cover" />
 *   </div>
 */
export function ManagedMedia({
  src,
  active,
  fallbackSrc,
  className = "",
}: {
  src: string | undefined;
  active: string | undefined;
  fallbackSrc: string;
  className?: string;
}) {
  const useAdminMedia = !!src && src.length > 0 && active === "true";
  if (useAdminMedia) {
    const isVideo = VIDEO_RE.test(src!);
    const resolvedSrc = getMediaUrl(src!);
    if (isVideo) {
      return (
        <video
          src={resolvedSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className={className}
        />
      );
    }
    return (
      <Image
        alt=""
        aria-hidden
        src={resolvedSrc}
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className={className}
      />
    );
  }
  return (
    <Image
      alt=""
      aria-hidden
      src={fallbackSrc}
      fill
      sizes="(min-width: 1024px) 50vw, 100vw"
      className={className}
    />
  );
}
