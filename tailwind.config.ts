import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        "mono-jet": ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        navy: {
          950: "#020a14",
          900: "#040d18",
          800: "#071623",
          700: "#0a1e35",
          600: "#0e2847",
          500: "#132f54",
        },
        arc: {
          cyan:   "#00d4ff",
          violet: "#8b5cf6",
          green:  "#10d6a0",
          amber:  "#f59e0b",
        },
      },
      boxShadow: {
        "glow-cyan":   "0 0 18px rgba(0,212,255,0.22), 0 0 40px rgba(0,212,255,0.06)",
        "glow-violet": "0 0 18px rgba(139,92,246,0.22), 0 0 40px rgba(139,92,246,0.06)",
        "glow-green":  "0 0 18px rgba(16,214,160,0.22), 0 0 40px rgba(16,214,160,0.06)",
        "glow-sm":     "0 0 10px rgba(0,212,255,0.14)",
        "card":        "0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in":    "fadeIn 0.15s ease-out",
        "scan":       "scan 4s linear infinite",
        "blink":      "blink 1.2s step-end infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scan: {
          "0%":   { backgroundPosition: "0 -100%" },
          "100%": { backgroundPosition: "0 200%" },
        },
        blink: {
          "0%,100%": { opacity: "1" },
          "50%":     { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
