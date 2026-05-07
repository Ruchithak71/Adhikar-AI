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
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-ibm-mono)", "monospace"],
        sans: ["var(--font-instrument)", "system-ui", "sans-serif"],
      },
      colors: {
        bg: {
          primary: "#07090f",
          secondary: "#0d1220",
          surface: "#111827",
          elevated: "#162033",
          border: "#1d2b3d",
          "border-light": "#243447",
        },
        amber: {
          glow: "#f5a623",
          dim: "#c47d0a",
          muted: "#7a4d08",
          subtle: "#2a1a06",
        },
        verdict: {
          green: "#10d9a8",
          yellow: "#fbbf24",
          red: "#f87171",
          "green-bg": "#0a2e26",
          "yellow-bg": "#2a1f06",
          "red-bg": "#2e0f0f",
        },
        ink: {
          primary: "#e2e8f4",
          secondary: "#8892a4",
          muted: "#4a5568",
          dim: "#2d3748",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.35s ease-out forwards",
        "pulse-amber": "pulseAmber 2s ease-in-out infinite",
        "bar-fill": "barFill 0.8s ease-out forwards",
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseAmber: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 166, 35, 0)" },
          "50%": { boxShadow: "0 0 12px 2px rgba(245, 166, 35, 0.15)" },
        },
        barFill: {
          "0%": { width: "0%" },
          "100%": { width: "var(--bar-width)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
