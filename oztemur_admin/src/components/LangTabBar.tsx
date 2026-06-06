"use client";
import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import type { LanguageDto } from "@/lib/api";
import Icon from "@/components/Icon";

interface Props {
  langs: LanguageDto[];
  activeLang: string;
  onSelect: (code: string) => void;
  /** Language codes flagged as missing required content — shown with a dot. */
  incomplete?: string[];
}

export default function LangTabBar({ langs, activeLang, onSelect, incomplete = [] }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // ── Drag-to-scroll state ──
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const hasMoved = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      const ro = new ResizeObserver(checkScroll);
      ro.observe(el);
      return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
    }
  }, [checkScroll, langs]);

  // ── Mouse drag handlers ──
  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = true;
    hasMoved.current = false;
    startX.current = e.clientX;
    scrollStart.current = el.scrollLeft;
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !scrollRef.current) return;
      const dx = e.clientX - startX.current;
      if (Math.abs(dx) > 3) hasMoved.current = true;
      scrollRef.current.scrollLeft = scrollStart.current - dx;
    };
    const onMouseUp = () => {
      if (!scrollRef.current) return;
      isDragging.current = false;
      scrollRef.current.style.cursor = "grab";
      scrollRef.current.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => { document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp); };
  }, []);

  // ── Wheel → horizontal scroll ──
  const onWheel = (e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  };

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 160, behavior: "smooth" });
  };

  const arrowBtn = (dir: "left" | "right", show: boolean): ReactNode => (
    <button
      type="button"
      onClick={() => scroll(dir === "left" ? -1 : 1)}
      style={{
        position: "absolute", top: 0, [dir]: 0, zIndex: 2,
        width: 28, height: "100%", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: dir === "left"
          ? "linear-gradient(to right, var(--surface) 60%, transparent)"
          : "linear-gradient(to left, var(--surface) 60%, transparent)",
        opacity: show ? 1 : 0,
        pointerEvents: show ? "auto" : "none",
        transition: "opacity .2s",
      }}
    >
      <Icon name={dir === "left" ? "chevron_left" : "chevron_right"} style={{ fontSize: 16, color: "var(--on-surface-variant)" }} />
    </button>
  );

  const handleTabClick = (code: string) => {
    // Don't trigger selection if the user was dragging
    if (hasMoved.current) return;
    onSelect(code);
  };

  const sortedLangs = [...langs].sort((a, b) => {
    if (a.code === "tr") return -1;
    if (b.code === "tr") return 1;
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });

  return (
    <div style={{ position: "relative", marginBottom: 20 }}>
      {arrowBtn("left", canScrollLeft)}
      {arrowBtn("right", canScrollRight)}
      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        style={{
          display: "flex", gap: 2, background: "var(--surface)", borderRadius: 8, padding: 3,
          overflowX: "auto", scrollbarWidth: "none", cursor: "grab",
          maskImage: `linear-gradient(to right, ${canScrollLeft ? "transparent, black 32px" : "black"}, ${canScrollRight ? "black calc(100% - 32px), transparent" : "black"})`,
          WebkitMaskImage: `linear-gradient(to right, ${canScrollLeft ? "transparent, black 32px" : "black"}, ${canScrollRight ? "black calc(100% - 32px), transparent" : "black"})`,
        }}
      >
        {sortedLangs.map(l => {
          const isDraft = !l.isActive;
          const isSelected = activeLang === l.code;
          const isIncomplete = incomplete.includes(l.code);
          return (
            <button key={l.code} type="button" onClick={() => handleTabClick(l.code)} style={{
              padding: "7px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              border: "none", cursor: "inherit", display: "flex", alignItems: "center", gap: 5,
              background: isSelected ? "var(--primary)" : "transparent",
              color: isSelected ? "#fff" : "var(--on-surface-variant)",
              transition: "all .15s", whiteSpace: "nowrap", flexShrink: 0,
              textTransform: "uppercase", letterSpacing: "0.04em",
              opacity: isDraft && !isSelected ? 0.7 : 1,
            }}>
              {isIncomplete && (
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: isSelected ? "#fff" : "var(--error)",
                }} />
              )}
              <span style={{ fontSize: 13, lineHeight: 1 }}>{l.code.toUpperCase()}</span>
              <span style={{ fontSize: 11, fontWeight: 500, textTransform: "none" }}>{l.nativeName || l.name}</span>
              {isDraft && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 4,
                  background: isSelected ? "rgba(255,255,255,0.22)" : "var(--warning-container, #fff3cd)",
                  color: isSelected ? "#fff" : "var(--warning, #8a6d3b)",
                  letterSpacing: "0.06em",
                }}>DRAFT</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
