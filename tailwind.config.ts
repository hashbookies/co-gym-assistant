import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Muted sage/forest green — calm and premium, not a bright SaaS emerald.
        // Kept as the single action/success color across the app.
        brand: {
          50: "#f2f7f4",
          100: "#dfece4",
          200: "#bfd9c9",
          300: "#98c0a8",
          400: "#71a385",
          500: "#4f8768",
          600: "#3d6d51",
          700: "#325942",
          800: "#294736",
          900: "#213a2c",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(41,37,36,0.04), 0 10px 24px -16px rgba(41,37,36,0.14)",
        lifted: "0 4px 10px rgba(41,37,36,0.06), 0 20px 40px -20px rgba(41,37,36,0.22)",
        nav: "0 -4px 16px -8px rgba(41,37,36,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
