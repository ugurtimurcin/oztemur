import type { CSSProperties } from "react";
import { ICON_PATHS } from "@/lib/icons";

type IconProps = {
  /** Material Symbols glyph name, e.g. "mail", "delete". */
  name: string;
  /** Optional explicit size. Otherwise the icon scales with font-size (1em). */
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** When set, the icon is announced to screen readers with this label. */
  title?: string;
};

/**
 * Inline SVG icon — the replacement for the old Material Symbols icon font.
 * Sizing follows the current font-size (set `size`, `style.fontSize`, or a
 * Tailwind `text-*` class); color follows `currentColor`.
 */
// Tailwind's preflight forces every <svg> to `display: block`, which breaks
// icons used inline with text inside non-flex containers (the glyph drops to
// its own line). Override with `inline-block` so the SVG behaves like the old
// font icon — callers that need `block` (e.g. centered empty-state icons)
// override via `style.display` and still win because their style spreads last.
const BASE_STYLE: CSSProperties = { display: "inline-block", verticalAlign: "middle" };

export default function Icon({ name, size, className, style, title }: IconProps) {
  const d = ICON_PATHS[name];
  if (!d) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Icon: unknown icon "${name}"`);
    }
    return null;
  }
  const mergedStyle: CSSProperties = size != null
    ? { ...BASE_STYLE, fontSize: size, ...style }
    : { ...BASE_STYLE, ...style };
  return (
    <svg
      viewBox="0 -960 960 960"
      width="1em"
      height="1em"
      fill="currentColor"
      className={className}
      style={mergedStyle}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path d={d} />
    </svg>
  );
}
