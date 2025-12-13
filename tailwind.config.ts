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
    extend: {
      fontFamily: {
        sans: ['gg sans', 'Noto Sans', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
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
        // Discord 2021 background levels
        discord: {
          tertiary: "hsl(var(--background-tertiary))",       // #202225
          secondary: "hsl(var(--background-secondary))",     // #2f3136
          primary: "hsl(var(--background-primary))",         // #36393f
          hover: "hsl(var(--background-modifier-hover))",    // #32353b
          selected: "hsl(var(--background-modifier-selected))", // #34373c
          active: "hsl(var(--background-modifier-active))",  // #393c43
          channels: "hsl(var(--channels-default))",          // #40444b
        },
        // Text colors
        text: {
          normal: "hsl(var(--text-normal))",
          muted: "hsl(var(--text-muted))",
          link: "hsl(var(--text-link))",
        },
        interactive: {
          normal: "hsl(var(--interactive-normal))",
          hover: "hsl(var(--interactive-hover))",
          active: "hsl(var(--interactive-active))",
          muted: "hsl(var(--interactive-muted))",
        },
        // Surface variants
        surface: {
          elevated: "hsl(var(--surface-elevated))",
          hover: "hsl(var(--surface-hover))",
        },
        // Status colors
        status: {
          online: "hsl(var(--online))",
          idle: "hsl(var(--idle))",
          dnd: "hsl(var(--dnd))",
          offline: "hsl(var(--offline))",
        },
        voice: {
          active: "hsl(var(--voice-active))",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "badge-pop": "badge-pop 0.3s ease-out forwards",
        "badge-shake": "badge-shake 0.5s ease-in-out",
      },
      boxShadow: {
        'elevation-low': '0 1px 0 rgba(4, 4, 5, 0.2), 0 1.5px 0 rgba(6, 6, 7, 0.05), 0 2px 0 rgba(4, 4, 5, 0.05)',
        'elevation-medium': '0 4px 4px rgba(0, 0, 0, 0.16)',
        'elevation-high': '0 8px 16px rgba(0, 0, 0, 0.24)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
