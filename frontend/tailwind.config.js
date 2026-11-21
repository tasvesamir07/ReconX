/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core semantic tokens - Clean Professional Light Theme (White Background)
        background: {
          DEFAULT: "#FFFFFF",      // Pure clean white
          elevated: "#F8FAFC",     // Slate-50 elevated surfaces
          overlay: "#FFFFFF",      // Modals, drawers
          hover: "#F1F5F9",        // Slate-100 hover states
        },
        canvas: {
          DEFAULT: "#FFFFFF",
          subtle: "#F8FAFC",
        },
        surface: {
          DEFAULT: "#FFFFFF",      // Pure white card backgrounds
          elevated: "#F8FAFC",     // Slate-50 elevated cards
          pressed: "#F1F5F9",      // Slate-100 active/pressed
        },
        border: {
          DEFAULT: "#E2E8F0",      // Slate-200 crisp hairline borders
          strong: "#CBD5E1",       // Slate-300 emphasized borders
          focus: "#059669",        // Emerald-600 focus rings
          error: "#DC2626",        // Red-600 error borders
        },
        line: {
          DEFAULT: "#E2E8F0",
          strong: "#CBD5E1",
        },
        "line-strong": "#CBD5E1",
        text: {
          DEFAULT: "#0F172A",      // Slate-900 primary text
          muted: "#475569",        // Slate-600 secondary text
          subtle: "#64748B",       // Slate-500 tertiary text
          inverse: "#FFFFFF",      // On accent backgrounds
        },
        ink: {
          DEFAULT: "#0F172A",
          muted: "#475569",
          subtle: "#64748B",
        },
        muted: {
          DEFAULT: "#475569",
          "30": "rgba(226, 232, 240, 0.3)",
        },
        subtle: "#64748B",
        elevated: "#F1F5F9",
        accent: {
          DEFAULT: "#059669",      // Emerald-600 primary brand
          hover: "#047857",        // Emerald-700 hover state
          pressed: "#065F46",      // Emerald-800 pressed state
          soft: "#ECFDF5",         // Emerald-50 subtle backgrounds
          glow: "rgba(5, 150, 105, 0.15)",
        },
        accentWarm: {
          DEFAULT: "#D97706",      // Amber-600 warning
          soft: "#FFFBEB",         // Amber-50
        },
        accentCool: {
          DEFAULT: "#0284C7",      // Sky-600 info
          soft: "#F0F9FF",         // Sky-50
        },
        destructive: {
          DEFAULT: "#DC2626",      // Red-600
          hover: "#B91C1C",        // Red-700
          soft: "#FEF2F2",         // Red-50
        },
        success: {
          DEFAULT: "#059669",      // Emerald-600
          soft: "#ECFDF5",         // Emerald-50
        },
        warning: {
          DEFAULT: "#D97706",
          soft: "#FFFBEB",
        },
        danger: {
          DEFAULT: "#DC2626",
          soft: "#FEF2F2",
        },
        info: {
          DEFAULT: "#0284C7",
          soft: "#F0F9FF",
        },
        // Severity-specific (for findings)
        severity: {
          critical: "#DC2626",
          criticalSoft: "#FEF2F2",
          high: "#EA580C",
          highSoft: "#FFF7ED",
          medium: "#D97706",
          mediumSoft: "#FFFBEB",
          low: "#0284C7",
          lowSoft: "#F0F9FF",
          info: "#64748B",
          infoSoft: "#F8FAFC",
        },
        // Status indicators
        status: {
          running: "#059669",
          queued: "#D97706",
          completed: "#059669",
          failed: "#DC2626",
          cancelled: "#64748B",
          partial: "#D97706",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-jetbrains-mono)", ...defaultTheme.fontFamily.mono],
        display: ["var(--font-inter-display)", ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        'display-xl': ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.15', letterSpacing: '-0.015em', fontWeight: '700' }],
        'display-md': ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-sm': ['clamp(1.25rem, 2.5vw, 1.75rem)', { lineHeight: '1.25', letterSpacing: '-0.005em', fontWeight: '600' }],
        'heading-xl': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-lg': ['1.25rem', { lineHeight: '1.35', letterSpacing: '-0.005em', fontWeight: '600' }],
        'heading-md': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'heading-sm': ['1rem', { lineHeight: '1.45', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.55', fontWeight: '400' }],
        'body-xs': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        'label-lg': ['0.875rem', { lineHeight: '1.5', fontWeight: '500' }],
        'label-md': ['0.8125rem', { lineHeight: '1.5', fontWeight: '500' }],
        'label-sm': ['0.75rem', { lineHeight: '1.45', fontWeight: '500' }],
        'label-xs': ['0.6875rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.02em', textTransform: 'uppercase' }],
        'code-sm': ['0.8125rem', { lineHeight: '1.55', fontWeight: '400' }],
        'code-xs': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }],
      },
      spacing: {
        '0': '0',
        '1': '0.125rem',   // 2px
        '2': '0.25rem',    // 4px
        '3': '0.375rem',   // 6px
        '4': '0.5rem',     // 8px
        '5': '0.625rem',   // 10px
        '6': '0.75rem',    // 12px
        '7': '0.875rem',   // 14px
        '8': '1rem',       // 16px
        '9': '1.25rem',    // 20px
        '10': '1.5rem',    // 24px
        '11': '1.75rem',   // 28px
        '12': '2rem',      // 32px
        '14': '2.5rem',    // 40px
        '16': '3rem',      // 48px
        '18': '3.5rem',    // 56px
        '20': '4rem',      // 64px
        '24': '5rem',      // 80px
        '28': '6rem',      // 96px
        '32': '7rem',      // 112px
      },
      borderRadius: {
        'none': '0',
        'xs': '0.25rem',    // 4px
        'sm': '0.375rem',   // 6px
        'md': '0.5rem',     // 8px
        'lg': '0.625rem',   // 10px
        'xl': '0.75rem',    // 12px
        '2xl': '1rem',      // 16px
        '3xl': '1.5rem',    // 24px
        'full': '9999px',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.35), 0 1px 2px -1px rgba(0, 0, 0, 0.35)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.45), 0 4px 6px -4px rgba(0, 0, 0, 0.35)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.55)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.4)',
        'focus': '0 0 0 2px #080C14, 0 0 0 4px #00D4AA',
        'focus-inset': 'inset 0 0 0 2px #00D4AA',
        'glow': '0 0 24px -4px rgba(0, 212, 170, 0.35)',
        'glow-subtle': '0 0 16px -4px rgba(0, 212, 170, 0.2)',
        'elevation-1': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'elevation-2': '0 4px 8px -2px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.25)',
        'elevation-3': '0 12px 24px -4px rgba(0, 0, 0, 0.45), 0 4px 8px -4px rgba(0, 0, 0, 0.3)',
        'elevation-4': '0 24px 48px -8px rgba(0, 0, 0, 0.5), 0 8px 16px -8px rgba(0, 0, 0, 0.35)',
      },
      transitionDuration: {
        '0': '0ms',
        '50': '50ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '350': '350ms',
        '400': '400ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
      transitionTimingFunction: {
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'scale-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.96)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'fade-in-fast': 'fade-in 100ms ease-out',
        'fade-in-slow': 'fade-in 400ms ease-out',
        'fade-out': 'fade-out 150ms ease-in',
        'slide-up': 'slide-up 200ms ease-out',
        'slide-down': 'slide-down 200ms ease-out',
        'slide-in-right': 'slide-in-right 200ms ease-out',
        'slide-in-left': 'slide-in-left 200ms ease-out',
        'scale-in': 'scale-in 180ms ease-out',
        'scale-out': 'scale-out 150ms ease-in',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 2s linear infinite',
      },
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'dropdown': '100',
        'sticky': '200',
        'overlay': '300',
        'modal': '400',
        'popover': '500',
        'tooltip': '600',
        'toast': '700',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
};