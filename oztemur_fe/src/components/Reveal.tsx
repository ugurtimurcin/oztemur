"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "fade" | "left" | "right";
  threshold?: number;
  duration?: number;
  className?: string;
}

const offsets: Record<NonNullable<RevealProps["direction"]>, string> = {
  up:    "translate3d(0, 28px, 0)",
  fade:  "translate3d(0, 0, 0)",
  left:  "translate3d(-28px, 0, 0)",
  right: "translate3d(28px, 0, 0)",
};

export default function Reveal({
  children,
  delay = 0,
  direction = "up",
  threshold = 0.15,
  duration = 800,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    if (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, visible]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0, 0, 0)" : offsets[direction],
        transition:
          `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, ` +
          `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: visible ? undefined : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
