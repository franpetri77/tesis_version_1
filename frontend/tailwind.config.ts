import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // -----------------------------------------------
      // PALETA DE COLORES - TELE IMPORT
      // Azul profesional como color primario.
      // Slate como color de superficie y grises fríos.
      // -----------------------------------------------
      colors: {
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      // -----------------------------------------------
      // SOMBRAS — más sutiles y controladas que las default
      // -----------------------------------------------
      boxShadow: {
        // Sombras Apple-style: sutiles, multicapa
        "card":        "0 2px 8px rgb(0 0 0 / 0.06)",
        "card-hover":  "0 12px 32px rgb(0 0 0 / 0.10), 0 2px 8px rgb(0 0 0 / 0.06)",
        "card-xl":     "0 20px 48px rgb(0 0 0 / 0.12), 0 4px 12px rgb(0 0 0 / 0.06)",
        "dropdown":    "0 8px 30px rgb(0 0 0 / 0.12), 0 2px 8px rgb(0 0 0 / 0.06)",
        "header":      "0 1px 0 0 #e2e8f0",
        "filter-pill": "0 1px 4px rgb(0 0 0 / 0.08)",
      },
      // -----------------------------------------------
      // ANIMACIONES — solo las necesarias
      // -----------------------------------------------
      keyframes: {
        "slide-in-right": {
          "0%":   { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)",    opacity: "1" },
        },
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%":   { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)",   opacity: "1" },
        },
        "shrink": {
          "0%":   { width: "100%" },
          "100%": { width: "0%" },
        },
        "slide-up": {
          "0%":   { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        "drawer-in": {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.25s ease-out",
        "fade-in":        "fade-in 0.2s ease-out",
        "pop-in":         "pop-in 0.15s ease-out",
        "shrink":         "shrink 3s linear forwards",
        "slide-up":       "slide-up 0.2s ease-out",
        "drawer-in":      "drawer-in 0.25s ease-out",
      },
      // -----------------------------------------------
      // TRANSICIONES
      // -----------------------------------------------
      transitionTimingFunction: {
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
