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
        accent: "#1E3FCB",
        "accent-soft": "#E9EDFB",
        status: {
          submitted: "#475569",
          "submitted-bg": "#EEF2F6",
          review: "#B45309",
          "review-bg": "#FEF3E2",
          discussion: "#7C3AED",
          "discussion-bg": "#F3EEFF",
          sprint: "#2563EB",
          "sprint-bg": "#EAF0FE",
          deployed: "#047857",
          "deployed-bg": "#E3F9F0",
          delayed: "#B91C1C",
          "delayed-bg": "#FDEBEB",
          rejected: "#374151",
          "rejected-bg": "#F1F2F4",
        },
        admin: {
          bg: "#0B0E14",
          sidebar: "#11141B",
          surface: "#171B24",
          border: "#262B36",
          ink: "#E6E8EC",
          "ink-muted": "#8B919E",
        },
        statusd: {
          submitted: "#94A3B8",
          review: "#FBBF24",
          discussion: "#C084FC",
          sprint: "#60A5FA",
          deployed: "#34D399",
          delayed: "#F87171",
          rejected: "#6B7280",
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
