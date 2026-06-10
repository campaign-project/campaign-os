import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"]
      },
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        civic: "var(--civic)",
        signal: "var(--signal)",
        field: "var(--field)"
      },
      boxShadow: {
        dossier: "0 28px 80px rgba(20, 23, 31, 0.16)"
      }
    }
  },
  plugins: []
}

export default config
