import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand palette: Forest Emerald + Sand ────────────
        // Token names kept stable across the codebase — values remapped
        // to the heritage Mediterranean palette.
        midnight: {
          DEFAULT: "#0F2A24",  // forest emerald (was navy)
          deep:    "#08201B",  // deeper emerald
          soft:    "#173B33",  // softer emerald
          tint:    "#1E4940",  // tinted emerald
        },
        champagne: {
          DEFAULT: "#B89968",  // sand stone (was champagne gold)
          bright:  "#D6BB8E",  // light sand
          dim:     "#8E7548",  // dim sand
        },
        ivory:    "#F0EAD8",   // soft warm ivory
        cream:    "#F5F0E6",   // warm cream (page bg)
        charcoal: "#1F2520",   // deep ink with green undertone
        steel:    "#6B6F69",   // sage gray (muted on dark)
        hairline: "rgba(184, 153, 104, 0.25)",

        // ── Semantic aliases (used across pages) ───────────
        background: "#F5F0E6",            // light page bg
        surface:    "#FFFFFF",            // cards on light
        "surface-muted": "#EAE3D2",       // deeper cream
        border:     "#DCD3BE",            // soft sand divider
        "on-background": "#1F2520",
        "on-surface":    "#1F2520",
        "on-muted":      "#5A5A50",
        danger:          "#A8432E",   // terracotta — flags invalid form fields, palette-coherent
      },
      borderRadius: {
        DEFAULT: "0rem",
        sm:  "0rem",
        md:  "0rem",
        lg:  "0rem",
        xl:  "0rem",
        full: "9999px",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        inter:   ["var(--font-inter)"],
      },
      letterSpacing: {
        "eyebrow": "0.32em",
      },
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "ken-burns": {
          "0%":   { transform: "scale(1.05)" },
          "100%": { transform: "scale(1.18)" },
        },
        "shimmer-line": {
          "0%":   { transform: "scaleX(0)", transformOrigin: "left" },
          "100%": { transform: "scaleX(1)", transformOrigin: "left" },
        },
        "wipe-in": {
          "0%":   { clipPath: "inset(0 0 0 100%)" },
          "100%": { clipPath: "inset(0 0 0 0)" },
        },
        "rise-up": {
          "0%":   { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up":      "fade-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-up-slow": "fade-up 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards",
        "fade-in":      "fade-in 1.4s ease forwards",
        "ken-burns":    "ken-burns 16s ease-out forwards",
        "shimmer-line": "shimmer-line 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.4s forwards",
        // Cinematic image reveal — clip-path curtain from right to left.
        "wipe-in":      "wipe-in 1100ms cubic-bezier(0.7, 0, 0.25, 1) forwards",
        // Slow editorial title rise — used when the stage swaps project.
        "rise-up":      "rise-up 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "rise-up-slow": "rise-up 1100ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
