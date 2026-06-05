/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "var(--bg-base)",
          elevated: "var(--bg-elevated)",
          panel: "var(--bg-panel)",
          overlay: "var(--bg-overlay)",
        },
        accent: {
          cyan: "var(--accent-cyan)",
          blue: "var(--accent-blue)",
        },
        status: {
          ok: "var(--status-ok)",
          pending: "var(--status-pending)",
          syncing: "var(--status-syncing)",
          warn: "var(--status-warn)",
          error: "var(--status-error)",
        },
        node: {
          cyan: "var(--node-cyan)",
          blue: "var(--node-blue)",
          violet: "var(--node-violet)",
          amber: "var(--node-amber)",
        },
        edge: "var(--edge)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        /* Legacy aliases — migrate components to token names over time */
        brain: {
          bg: "var(--bg-base)",
          panel: "var(--bg-elevated)",
          accent: "var(--accent-blue)",
          glow: "var(--accent-cyan)",
          muted: "var(--text-muted)",
        },
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        7: "var(--space-7)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        "glow-cyan": "var(--glow-cyan)",
        "glow-soft": "var(--glow-soft)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        hud: ["var(--font-hud)"],
      },
      fontSize: {
        display: [
          "var(--font-size-display)",
          { lineHeight: "var(--line-height-display)" },
        ],
        h1: ["var(--font-size-h1)", { lineHeight: "var(--line-height-h1)" }],
        h2: ["var(--font-size-h2)", { lineHeight: "var(--line-height-h2)" }],
        body: [
          "var(--font-size-body)",
          { lineHeight: "var(--line-height-body)" },
        ],
        label: [
          "var(--font-size-label)",
          { lineHeight: "var(--line-height-label)" },
        ],
        caption: [
          "var(--font-size-caption)",
          { lineHeight: "var(--line-height-caption)" },
        ],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "sync-spin": "sync-spin 1.2s linear infinite",
        "brain-spin": "brain-spin 48s linear infinite",
        "beam-pulse": "beam-pulse 2.8s ease-in-out infinite",
        "radar-sweep": "radar-sweep 4s linear infinite",
        "particle-drift": "particle-drift 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "sync-spin": {
          to: { transform: "rotate(360deg)" },
        },
        "brain-spin": {
          to: { transform: "rotate(360deg)" },
        },
        "beam-pulse": {
          "0%, 100%": { opacity: "0.35", transform: "scaleY(0.92)" },
          "50%": { opacity: "1", transform: "scaleY(1)" },
        },
        "radar-sweep": {
          to: { transform: "rotate(360deg)" },
        },
        "particle-drift": {
          "0%, 100%": { opacity: "0.2", transform: "translateY(0)" },
          "50%": { opacity: "0.9", transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};
