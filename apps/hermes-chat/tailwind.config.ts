import type { Config } from "tailwindcss";
<<<<<<< HEAD
import baseConfig from "../../packages/config/tailwind/base";
=======
import baseConfig from "@hermes/tailwind-config";
>>>>>>> main

export default {
  ...baseConfig,
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
} satisfies Config;
