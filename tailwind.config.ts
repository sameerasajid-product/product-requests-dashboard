import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F7F7F5",
        surface: "#FFFFFF",
        border: "#E4E4E0",
        ink: "#15171C",
        "ink-muted": "#6B6F76",
        accent: "#3454D1",
        "accent-soft": "#EEF1FC",
        status: {
          submitted: "#475569",
          "submitted-bg": "#EEF2F6",
          review: "#B45309",
          "review-bg": "#FEF3E2",
          discussion: "#7C3AED",
          "discussion-bg": "#F3EEFF",
          sprint: "#2563EB",
          "sprint-bg": "#EAF0FE",
          deployed: "#15803D",
          "deployed-bg": "#E9F7EF",
          delayed: "#B91C1C",
          "delayed-bg": "#FDEBEB",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SF Mono",
          "JetBrains Mono",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;