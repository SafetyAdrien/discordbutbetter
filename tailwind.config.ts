import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      // Mobile device tiers (covers iPhone SE → Redmagic 6 → S24 Ultra → foldables)
      'xxs': '320px',
      'xs': '360px',
      'sm-mobile': '380px',
      'md-mobile': '400px',
      'lg-mobile': '430px',
      'xl-mobile': '480px',
      // Classic Tailwind defaults preserved
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // Capability queries
      'touch': { 'raw': '(pointer: coarse)' },
      'mouse': { 'raw': '(hover: hover) and (pointer: fine)' },
      'tall': { 'raw': '(min-height: 900px)' },
      'short': { 'raw': '(max-height: 700px)' },
      'landscape': { 'raw': '(orientation: landscape)' },
      'portrait': { 'raw': '(orientation: portrait)' },
      'standalone': { 'raw': '(display-mode: standalone)' },
      'high-dpr': { 'raw': '(min-resolution: 2dppx)' },
      'foldable': { 'raw': '(horizontal-viewport-segments: 2), (spanning: single-fold-vertical)' },
    },

    extend: {
      transitionDuration: {
        'fast': '100ms',
        'normal': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'snap': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        
        ginto: ['gg sans', 'Noto Sans', 'Helvetica', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        toolbar: "hsl(var(--toolbar))",
        // Custom gaming colors
        glow: {
          primary: "hsl(var(--glow-primary))",
          secondary: "hsl(var(--glow-secondary))",
        },
        surface: {
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
          elevated: "hsl(var(--surface-elevated))",
          hover: "hsl(var(--surface-hover))",
          "server-list": "hsl(var(--surface-server-list))",
        },
        status: {
          online: "hsl(var(--online))",
          idle: "hsl(var(--idle))",
          dnd: "hsl(var(--dnd))",
          offline: "hsl(var(--offline))",
        },
        voice: {
          active: "hsl(var(--voice-active))",
        },
        poll: {
          DEFAULT: "hsl(var(--poll-background))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        '3xl': 'var(--radius-3xl)',
        '2xl': 'var(--radius-2xl)',
        xl: 'var(--radius-xl)',
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "1" },
          "50%": { transform: "scale(1)", opacity: "0.5" },
          "100%": { transform: "scale(0.95)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "badge-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "badge-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-2px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(2px)" },
        },
        "press": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.95)" },
        },
        "appear": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-bottom": {
          "0%": { opacity: "0", transform: "translate(-50%, 8px)" },
          "100%": { opacity: "1", transform: "translate(-50%, 0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "badge-pop": "badge-pop 0.3s ease-out forwards",
        "badge-shake": "badge-shake 0.5s ease-in-out",
        "press": "press 150ms ease-out",
        "appear": "appear 200ms ease-out",
        "slide-in-bottom": "slide-in-bottom 220ms ease-out",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-gaming": "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addUtilities }: any) {
      addUtilities({
        '.pt-safe': { paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)' },
        '.pb-safe': { paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)' },
        '.pl-safe': { paddingLeft: 'max(env(safe-area-inset-left, 0px), 0px)' },
        '.pr-safe': { paddingRight: 'max(env(safe-area-inset-right, 0px), 0px)' },
        '.px-safe': {
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 0px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 0px)',
        },
        '.py-safe': {
          paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
        },
        '.mb-kb': { marginBottom: 'var(--kb-offset, 0px)' },
        '.pb-kb': { paddingBottom: 'var(--kb-offset, 0px)' },
        '.bottom-kb': { bottom: 'var(--kb-offset, 0px)' },
        '.h-dvh': { height: '100dvh' },
        '.min-h-dvh': { minHeight: '100dvh' },
        '.h-svh': { height: '100svh' },
        '.h-lvh': { height: '100lvh' },
      });
    },
  ],
} satisfies Config;

