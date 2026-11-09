import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "var(--paper)",
          raised: "var(--paper-raised)",
          sunken: "var(--paper-sunken)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          faint: "var(--ink-faint)",
        },
        rule: {
          DEFAULT: "var(--rule)",
          soft: "var(--rule-soft)",
        },
        oxblood: {
          DEFAULT: "var(--oxblood)",
          tint: "var(--oxblood-tint)",
        },
        ochre: {
          DEFAULT: "var(--ochre)",
          tint: "var(--ochre-tint)",
        },
        slate: {
          DEFAULT: "var(--slate)",
          tint: "var(--slate-tint)",
        },
        moss: {
          DEFAULT: "var(--moss)",
          tint: "var(--moss-tint)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
        },
      },
      fontFamily: {
        serif: ["var(--font-newsreader)", "Georgia", "serif"],
        display: ["var(--font-newsreader)", "Georgia", "serif"],
        sans: ["var(--font-instrument-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "4px",
        md: "4px",
        lg: "6px",
      },
      maxWidth: {
        prose: "68ch",
        draft: "68ch",
      },
      boxShadow: {
        hairline: "0 1px 2px 0 rgba(22, 20, 15, 0.04)",
        raised: "0 2px 4px 0 rgba(22, 20, 15, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;

