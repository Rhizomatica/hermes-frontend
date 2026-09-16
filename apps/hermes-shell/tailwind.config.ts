import type { Config } from 'tailwindcss';
import baseConfig from '@hermes/tailwind-config/base';

const config: Pick<Config, 'content' | 'presets'> = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [baseConfig],
};

export default config;