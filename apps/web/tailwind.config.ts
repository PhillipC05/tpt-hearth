import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem"
      },
      screens: {
        sm: "40rem",
        md: "48rem",
        lg: "64rem",
        xl: "80rem"
      }
    },
    extend: {
      colors: {
        ember: {
          DEFAULT: "#D46A2E",
          50: "#FFF3EC",
          100: "#FFE1D0",
          200: "#FFC4A2",
          300: "#F79B65",
          400: "#E67A42",
          500: "#D46A2E",
          600: "#B84D22",
          700: "#8F371E",
          800: "#712B1F",
          900: "#5C251D"
        },
        ash: {
          DEFAULT: "#2C2C2E",
          50: "#F7F6F3",
          100: "#E7E4DD",
          200: "#D0C9BD",
          300: "#A99F91",
          400: "#766B61",
          500: "#5C524D",
          600: "#463E3D",
          700: "#383335",
          800: "#302D30",
          900: "#2C2C2E",
          950: "#1F1F21"
        },
        sand: {
          DEFAULT: "#E8DCC4",
          50: "#FFFDF7",
          100: "#FFF7E8",
          200: "#FCEBCF",
          300: "#F4D8AD",
          400: "#ECC58E",
          500: "#E8DCC4",
          600: "#D1B68C",
          700: "#A9875F",
          800: "#8A684A",
          900: "#71543F"
        },
        pine: {
          DEFAULT: "#1A2F1A",
          50: "#F2F7F0",
          100: "#E0EBDC",
          200: "#C2D7BA",
          300: "#95B88D",
          400: "#679864",
          500: "#487A45",
          600: "#315D34",
          700: "#26492B",
          800: "#203B26",
          900: "#1A2F1A",
          950: "#101F12"
        }
      },
      fontFamily: {
        serif: ["var(--font-eb-garamond)", "EB Garamond", "serif"],
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      fontSize: {
        "body-sm": ["0.875rem", { lineHeight: "1.6", letterSpacing: "0.01em" }],
        "body": ["1rem", { lineHeight: "1.75", letterSpacing: "0.01em" }],
        "body-lg": ["1.125rem", { lineHeight: "1.8", letterSpacing: "0.005em" }],
        "display-sm": ["1.75rem", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        "display": ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-lg": ["3rem", { lineHeight: "1.08", letterSpacing: "-0.03em" }]
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        28: "7rem",
        32: "8rem",
        40: "10rem"
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem"
      },
      boxShadow: {
        ember: "0 0 40px rgba(212, 106, 46, 0.18)",
        "ember-soft": "0 0 70px rgba(212, 106, 46, 0.12)",
        "lodge": "0 24px 80px rgba(0, 0, 0, 0.28)"
      },
      keyframes: {
        "ember-glow": {
          "0%, 100%": { opacity: "0.32", transform: "scale(0.96)" },
          "50%": { opacity: "0.68", transform: "scale(1.035)" }
        },
        "slow-fade-in": {
          from: { opacity: "0", transform: "translateY(0.75rem)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "slow-fade-up": {
          from: { opacity: "0", transform: "translateY(1rem)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "slow-pulse": {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.9" }
        }
      },
      animation: {
        "ember-glow": "ember-glow 5.5s ease-in-out infinite",
        "slow-fade-in": "slow-fade-in 700ms ease-out both",
        "slow-fade-up": "slow-fade-up 850ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "slow-pulse": "slow-pulse 3.5s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;