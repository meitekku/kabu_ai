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
        'shikiho-sm': '0 0 15px rgba(0, 0, 0, 0.08)',
        'shikiho-md': '0 0 15px rgba(0, 0, 0, 0.12)',
        'shikiho-lg': '5px 5px 6px rgba(0, 0, 0, 0.082)',
      },
      colors: {
        shikiho: {
          'text-primary': '#333333',
          'text-secondary': '#707070',
          'text-tertiary': '#9d9d9d',
          'link-primary': '#0066cc',
          'link-secondary': '#4073a7',
          'bg-body': '#FFFFFF',
          'bg-gray': '#f7f7f7',
          'bg-gray-light': '#f5f5f5',
          'bg-border': '#dedede',
          'bg-border-light': '#e8e8e8',
          'accent-red': '#e81a0a',
          'accent-red-light': '#ea433c',
          'accent-orange': '#ea723c',
          'accent-blue': '#6499c6',
          'accent-green': '#2fba85',
          'positive': '#2fba85',
          'negative': '#e81a0a',
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