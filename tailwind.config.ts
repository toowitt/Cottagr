import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'media',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        xs: '1.25rem',
        lg: '2rem',
        xl: '2.5rem',
      },
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
    },
    extend: {
      colors: {
        background: 'var(--color-surface)',
        'background-muted': 'var(--color-surface-muted)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        border: 'var(--color-border)',
        ring: 'var(--color-ring)',
        muted: {
          DEFAULT: 'var(--color-text-muted)',
          fg: 'var(--color-text-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          strong: 'var(--color-accent-strong)',
          subtle: 'var(--color-accent-subtle)',
        },
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        success: 'var(--color-success)',
      },
      backgroundColor: {
        base: 'var(--color-surface)',
      },
      textColor: {
        base: 'var(--color-text)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '"SF Pro Text"',
          '"Segoe UI"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 8px 30px -18px rgba(15, 23, 42, 0.25)',
        'soft-strong': '0 18px 45px -25px rgba(52, 211, 153, 0.35)',
      },
      maxWidth: {
        'content-sm': '40rem',
        content: '72rem',
        'content-lg': '90rem',
      },
      spacing: {
        '2xs': 'var(--space-2xs)',
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
      },
    },
  },
  plugins: [],
};

export default config;
