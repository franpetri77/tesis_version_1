import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        "3xl": "1920px",
      },
      // -----------------------------------------------
      // PALETA DE COLORES - TELE IMPORT
      // Azul cobalto sobrio como color primario: menos saturado que el azul
      // por defecto de Tailwind, que se veía sintético junto al papel cálido.
      // brand-600 con texto blanco tiene contraste ~7:1 (AA y AAA en texto normal).
      // Slate como color de texto y grises fríos.
      // -----------------------------------------------
      colors: {
        brand: {
          50:  "#F2F5FB",
          100: "#E3E9F6",
          200: "#C6D2EC",
          300: "#9DB0DD",
          400: "#7088C9",
          500: "#4D67B4",
          600: "#34509E",
          700: "#2A4185",
          800: "#22356B",
          900: "#1C2B55",
          950: "#121B36",
        },
        // -----------------------------------------------
        // NEUTROS CÁLIDOS — superficies de página
        // Los grises de Tailwind (slate) tiran a azul. Estos neutros
        // llevan una punta de amarillo: dan un blanco menos clínico y
        // hacen que las fotos de producto se vean más cálidas.
        // Se usan para fondos y separadores; el texto sigue en slate.
        // -----------------------------------------------
        paper: {
          50:  "#FDFDFC",
          100: "#F7F6F3",
          200: "#F0EEE9",
          300: "#E6E3DC",
          400: "#D5D1C7",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter, Inter)", "system-ui", "sans-serif"],
        // Misma familia en títulos y texto; la jerarquía cambia por escala y peso.
        display: ["var(--font-inter, Inter)", "system-ui", "sans-serif"],
      },
      // Tracking negativo para títulos editoriales: a cuerpos grandes,
      // el espaciado normal deja los títulos sueltos y desarmados.
      letterSpacing: {
        "display": "-0.03em",
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
        // Portada: acercamiento lento de la foto mientras el slide está activo
        "hero-zoom": {
          "0%":   { transform: "scale(1.02) translate3d(0, 0, 0)" },
          "100%": { transform: "scale(1.12) translate3d(-1.5%, -1%, 0)" },
        },
        // Portada: el texto sube y aparece escalonado al entrar el slide
        "hero-rise": {
          "0%":   { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Franja del carrito: se despliega debajo del header
        "strip-in": {
          "0%":   { maxHeight: "0", opacity: "0" },
          "100%": { maxHeight: "3rem", opacity: "1" },
        },
        // Franja del carrito: destello suave al agregar un producto
        "strip-flash": {
          "0%":   { backgroundColor: "#C6D2EC" },
          "100%": { backgroundColor: "transparent" },
        },
        // Ícono del carrito: rebote al agregar un producto
        "cart-bump": {
          "0%, 100%": { transform: "scale(1)" },
          "30%":      { transform: "scale(1.25) rotate(-8deg)" },
          "60%":      { transform: "scale(0.95)" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.25s ease-out",
        "fade-in":        "fade-in 0.2s ease-out",
        "pop-in":         "pop-in 0.15s ease-out",
        "shrink":         "shrink 3s linear forwards",
        "slide-up":       "slide-up 0.2s ease-out",
        "drawer-in":      "drawer-in 0.25s ease-out",
        "hero-zoom":      "hero-zoom 8s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
        "hero-rise":      "hero-rise 0.75s cubic-bezier(0.16, 1, 0.3, 1) both",
        "strip-in":       "strip-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "strip-flash":    "strip-flash 0.9s ease-out",
        "cart-bump":      "cart-bump 0.5s ease-out",
      },
      // -----------------------------------------------
      // TRANSICIONES
      // -----------------------------------------------
      transitionTimingFunction: {
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
        // Curva de desaceleración pronunciada, para entradas de contenido:
        // arranca rápido y frena suave, que es lo que da sensación de
        // "asentarse" en lugar de simplemente aparecer.
        "entrada": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
