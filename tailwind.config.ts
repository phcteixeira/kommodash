import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f8fafc",
        },
      },
    },
  },
  plugins: [],
};

export default config;
