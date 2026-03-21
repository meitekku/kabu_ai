/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
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
        sans: [
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'YakuHanJP',
          '"Hiragino Sans"',
          '"Hiragino Kaku Gothic ProN"',
          '"Noto Sans JP"',
          'Meiryo',
          'sans-serif'
        ],
      },
      fontSize: {
        'xxs': '10px',
      },
      boxShadow: {
        'shikiho-sm': '0 1px 2px rgba(0, 0, 0, 0.06)',
        'shikiho-md': '0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.02), 0 0 2px rgba(0,0,0,0.04)',
        'shikiho-lg': '0 4px 8px rgba(0, 0, 0, 0.1)',
        'card': '0 1px 3px rgba(0,0,0,0.1), 0 2px 2px rgba(0,0,0,0.02), 0 0 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      colors: {
        shikiho: {
          'text-primary': '#222222',
          'text-secondary': '#686868',
          'text-tertiary': '#999999',
          'link-primary': '#cc0000',
          'link-secondary': '#990000',
          'bg-body': '#ffffff',
          'bg-gray': '#fafafa',
          'bg-gray-light': '#f2f2f2',
          'bg-border': '#d9d9d9',
          'accent-red': '#cc0000',
          'accent-green': '#10b981',
          'positive': '#10b981',
          'negative': '#ef4444',
        },
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}