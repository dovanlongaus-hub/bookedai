import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0B1020",
        bgSoft: "#121A2B",
        surface: "#182235",
        surfaceAlt: "rgba(255,255,255,0.04)",
        border: "rgba(255,255,255,0.08)",
        textPrimary: "#F8FAFC",
        textSecondary: "#94A3B8",
        primaryBlue: "#4F8CFF",
        accentGreen: "#22C55E",
        accentPurple: "#8B5CF6",
        warningAmber: "#F59E0B",
        dangerRed: "#EF4444",
      },
      backgroundImage: {
        brandGradient: "linear-gradient(135deg, #4F8CFF 0%, #8B5CF6 50%, #22C55E 100%)",
        heroGlow: "radial-gradient(circle at top left, rgba(79,140,255,0.24), transparent 45%)",
        greenGlow: "radial-gradient(circle at top right, rgba(34,197,94,0.20), transparent 40%)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      fontSize: {
        heroDisplay: "clamp(3rem, 6vw, 5.5rem)",
        h1: "clamp(2.5rem, 5vw, 4.5rem)",
        h2: "clamp(2rem, 4vw, 3rem)",
        h3: "1.5rem",
        bodyLg: "1.125rem",
        bodyMd: "1rem",
        bodySm: "0.875rem",
      },
      borderRadius: {
        sm: "12px",
        md: "18px",
        lg: "24px",
        xl: "32px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 10px 40px rgba(2,6,23,0.38)",
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 18px 60px rgba(79,140,255,0.14)",
      },
      maxWidth: {
        container: "1200px",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        floatSoft: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "float-soft": "floatSoft 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
