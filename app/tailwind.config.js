/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"], // Added components path
  presets: [require("nativewind/preset")],
  darkMode: "media", // Use media queries for automatic dark mode detection
  theme: {
    extend: {
      colors: {
        border: "hsl(240 5.9% 90%)",
        input: "hsl(240 5.9% 90%)",
        ring: "hsl(240 10% 3.9%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(240 10% 3.9%)",
        primary: {
          DEFAULT: "hsl(240 5.9% 10%)",
          foreground: "hsl(0 0% 98%)",
        },
        secondary: {
          DEFAULT: "hsl(240 4.8% 95.9%)",
          foreground: "hsl(240 5.9% 10%)",
        },
        destructive: {
          DEFAULT: "hsl(0 84.2% 60.2%)",
          foreground: "hsl(0 0% 98%)",
        },
        muted: {
          DEFAULT: "hsl(240 4.8% 95.9%)",
          foreground: "hsl(240 3.8% 46.1%)",
        },
        accent: {
          DEFAULT: "hsl(240 4.8% 95.9%)",
          foreground: "hsl(240 5.9% 10%)",
        },
        popover: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(240 10% 3.9%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(240 10% 3.9%)",
        },
      },
      // Dark mode color overrides
      screens: {
        dark: { raw: "(prefers-color-scheme: dark)" },
      },
      borderRadius: {
        lg: "0.5rem", // Directly using value from --radius
        md: "calc(0.5rem - 2px)", // Using calc might need adjustment in RN
        sm: "calc(0.5rem - 4px)", // Using calc might need adjustment in RN
      },
    },
  },
  plugins: [
    // Add plugin to handle dark mode colors
    function({ addUtilities }) {
      addUtilities({
        '@media (prefers-color-scheme: dark)': {
          '.dark\\:bg-background': {
            'background-color': 'hsl(240 10% 3.9%)',
          },
          '.dark\\:text-foreground': {
            color: 'hsl(0 0% 98%)',
          },
          '.dark\\:border-border': {
            'border-color': 'hsl(240 3.7% 15.9%)',
          },
          '.dark\\:bg-card': {
            'background-color': 'hsl(240 10% 3.9%)',
          },
          '.dark\\:text-card-foreground': {
            color: 'hsl(0 0% 98%)',
          },
          '.dark\\:bg-muted': {
            'background-color': 'hsl(240 3.7% 15.9%)',
          },
          '.dark\\:text-muted-foreground': {
            color: 'hsl(240 5% 64.9%)',
          },
          '.dark\\:bg-primary': {
            'background-color': 'hsl(0 0% 98%)',
          },
          '.dark\\:text-primary-foreground': {
            color: 'hsl(240 5.9% 10%)',
          },
          '.dark\\:border-input': {
            'border-color': 'hsl(240 3.7% 15.9%)',
          },
          '.dark\\:bg-destructive\\/10': {
            'background-color': 'hsl(0 62.8% 30.6% / 0.1)',
          },
          '.dark\\:border-destructive\\/50': {
            'border-color': 'hsl(0 62.8% 30.6% / 0.5)',
          },
        }
      })
    }
  ],
}