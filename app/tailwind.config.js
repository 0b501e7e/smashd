/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"], // Added components path
  presets: [require("nativewind/preset")],
  darkMode: "class", // Enable class-based dark mode like frontend
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
        // Dark mode colors (can be applied using 'dark:' prefix)
        dark: {
          border: "hsl(45 50% 30%)",
          input: "hsl(240 4% 15%)",
          ring: "hsl(45 90% 50%)",
          background: "hsl(0 0% 0%)",
          foreground: "hsl(0 0% 98%)",
          primary: {
            DEFAULT: "hsl(45 90% 50%)", // Yellow
            foreground: "hsl(0 0% 5%)",   // Dark text for yellow bg
          },
          secondary: {
            DEFAULT: "hsl(45 90% 20%)", // Darker yellow/brown
            foreground: "hsl(0 0% 98%)",
          },
          destructive: {
            DEFAULT: "hsl(40 90% 35%)", // Adjusted destructive for dark
            foreground: "hsl(45 90% 85%)",
          },
          muted: {
            DEFAULT: "hsl(240 4% 15%)",
            foreground: "hsl(240 5% 65%)",
          },
          accent: {
            DEFAULT: "hsl(45 90% 50%)", // Yellow
            foreground: "hsl(0 0% 5%)",   // Dark text for yellow bg
          },
          popover: {
            DEFAULT: "hsl(240 10% 3.9%)",
            foreground: "hsl(0 0% 98%)",
          },
          card: {
            DEFAULT: "hsl(240 5% 10%)",
            foreground: "hsl(0 0% 98%)",
          },
        }
      },
      borderRadius: {
        lg: "0.5rem", // Directly using value from --radius
        md: "calc(0.5rem - 2px)", // Using calc might need adjustment in RN
        sm: "calc(0.5rem - 4px)", // Using calc might need adjustment in RN
      },
    },
  },
  plugins: [], // Keeping plugins minimal for now
}