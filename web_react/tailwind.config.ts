import type { Config } from "tailwindcss";

const tone = (token: string) => `color-mix(in oklab, var(${token}) calc(<alpha-value> * 100%), transparent)`;

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        paper: { DEFAULT: tone("--color-paper"), 2: tone("--color-paper-2"), 3: tone("--color-paper-3") },
        ink: { DEFAULT: tone("--color-ink"), 2: tone("--color-ink-2") },
        rule: { DEFAULT: tone("--color-rule"), 2: tone("--color-rule-2") },
        signal: { DEFAULT: tone("--color-accent"), hi: tone("--color-accent-hi"), ink: tone("--color-accent-ink"), soft: tone("--color-accent-soft") },
        point: { lo: tone("--point-lo"), mid: tone("--point-mid"), hi: tone("--point-hi") },
        cool: { DEFAULT: tone("--color-cool"), soft: tone("--color-cool-soft") },
        ok: { DEFAULT: tone("--color-ok"), soft: tone("--color-ok-soft") },
        bad: { DEFAULT: tone("--color-bad"), soft: tone("--color-bad-soft") },
        border: tone("--color-rule"),
        input: tone("--color-muted"),
        ring: tone("--color-focus"),
        background: tone("--color-paper"),
        foreground: tone("--color-ink"),
        primary: { DEFAULT: tone("--color-accent"), foreground: tone("--color-accent-ink") },
        secondary: { DEFAULT: tone("--color-paper-3"), foreground: tone("--color-ink-2") },
        destructive: { DEFAULT: tone("--color-bad"), foreground: tone("--color-paper-3") },
        muted: { DEFAULT: tone("--color-paper-2"), foreground: tone("--color-muted") },
        accent: { DEFAULT: tone("--color-paper-3"), foreground: tone("--color-ink") },
        warning: { DEFAULT: tone("--color-accent"), foreground: tone("--color-accent-ink") },
        success: { DEFAULT: tone("--color-ok"), foreground: tone("--color-paper-3") },
        popover: { DEFAULT: tone("--color-paper-2"), foreground: tone("--color-ink") },
        card: { DEFAULT: tone("--color-paper-2"), foreground: tone("--color-ink") },
      },
      fontFamily: {
        sans: ["var(--font-body)"],
        mono: ["var(--font-outlier)"],
      },
      fontWeight: {
        normal: "300",
        medium: "400",
        semibold: "400",
        bold: "400",
        extrabold: "400",
      },
      borderRadius: {
        lg: "var(--radius-card)",
        md: "var(--radius-card)",
        sm: "2px",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
      keyframes: {
        "accordion-down": {
          from: { transform: "scaleY(0.96)", opacity: "0" },
          to: { transform: "none", opacity: "1" },
        },
        "accordion-up": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down var(--dur-short) var(--ease-out)",
        "accordion-up": "accordion-up var(--dur-micro) var(--ease-in)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
