import type { Config } from "tailwindcss";

const baseConfig: Omit<Config, "content"> = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};

export default baseConfig;
