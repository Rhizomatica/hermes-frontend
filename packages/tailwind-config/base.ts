import type { Config } from 'tailwindcss';

/**
 * HERMES base Tailwind configuration — sBitx canonical viewport.
 *
 * Defines design tokens for the sBitx 7-inch 800×480 touchscreen
 * as the canonical target (ADR-008). All apps extend this config.
 *
 * Imported as a Tailwind preset: `presets: [baseConfig]`
 *
 * Key constraints:
 * - Viewport: 800×480 (WVGA), touch-first, no hover
 * - Chromium kiosk mode: single tab, no beforeunload, no window.open()
 * - Touch targets: minimum 44px (WCAG 2.2 AAA)
 * - Fonts: self-hosted, 16px minimum, 18px body
 */
const baseConfig: Omit<Config, 'content'> = {
  darkMode: 'class',
  theme: {
    extend: {
      // ------------------------------------------------------------------
      // Screen breakpoints
      // Canonical sBitx: 0–639px (portrait on 7-inch)
      // Larger devices are supported but secondary
      // ------------------------------------------------------------------
      screens: {
        // sBitx native — 800×480 viewport
        sbitx: { max: '639px' },
        // Tablet: from 640px up
        sm: '640px',
        // Desktop: from 768px up
        md: '768px',
        // Large desktop: from 1024px up
        lg: '1024px',
      },

      // ------------------------------------------------------------------
      // Spacing tokens
      // Touch target minimum: 44px (WCAG 2.2 AAA)
      // Touch-friendly tap area: 48px (Apple HIG recommended)
      // ------------------------------------------------------------------
      spacing: {
        touch: '44px',
        'touch-lg': '48px',
      },

      // ------------------------------------------------------------------
      // Font families (self-hosted per ADR-008)
      // Subset: Latin + Portuguese characters, font-display: swap
      // ------------------------------------------------------------------
      fontFamily: {
        sans: [
          'Geist',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },

      // ------------------------------------------------------------------
      // Font sizes
      // Minimum 16px base, 18px body for readability on 7-inch screen
      // in varying light conditions (outdoor, vehicle, low light).
      // ------------------------------------------------------------------
      fontSize: {
        base: ['1.125rem', { lineHeight: '1.6' }], // 18px body
        sm: ['1rem', { lineHeight: '1.5' }], // 16px minimum
        xs: ['0.875rem', { lineHeight: '1.4' }], // 14px (labels only)
        lg: ['1.25rem', { lineHeight: '1.5' }], // 20px
        xl: ['1.5rem', { lineHeight: '1.4' }], // 24px
        '2xl': ['1.75rem', { lineHeight: '1.3' }], // 28px
        '3xl': ['2rem', { lineHeight: '1.2' }], // 32px
        '4xl': ['2.5rem', { lineHeight: '1.1' }], // 40px
      },

      // ------------------------------------------------------------------
      // Z-index scale — prevents stacking context conflicts
      // ------------------------------------------------------------------
      zIndex: {
        0: '0',
        10: '10',
        20: '20',
        30: '30', // Dropdowns, selects
        40: '40', // Sticky headers
        50: '50', // Modals, dialogs
        100: '100', // Toast notifications
      },
    },
  },
  plugins: [],
};

export default baseConfig;