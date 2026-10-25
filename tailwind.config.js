/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Official Nivaro 60-30-10 Brand Palette
        // 60% - Warm Cream: #F5E6CC
        cream: {
          DEFAULT: '#F5E6CC',
          50: '#FDFBF7',
          100: '#FAF3E7',
          200: '#F5E6CC', // Brand Warm Cream (60%)
          300: '#EAD5B3',
          400: '#DEC091',
          surface: '#FAF3E7',
          light: '#FFFFFF',
          border: '#E8D5B5',
        },
        // 30% - Charcoal Grey: #4A4A4A
        charcoal: {
          DEFAULT: '#4A4A4A', // Brand Charcoal Grey (30%)
          50: '#F7F7F7',
          100: '#EBEBEB',
          200: '#D6D6D6',
          300: '#B0B0B0',
          400: '#7A7A7A',
          500: '#4A4A4A',
          600: '#3D3D3D',
          700: '#2E2E2E', // Deep Charcoal for high-contrast headings
          800: '#222222',
          900: '#171717',
          text: '#4A4A4A',
          heading: '#2E2E2E',
          muted: '#6E6E6E',
          border: '#D8CBB6',
          dark: '#242424',
        },
        // 10% - Terracotta Orange: #E27D60
        terracotta: {
          DEFAULT: '#E27D60', // Brand Terracotta Orange (10% Primary CTA)
          hover: '#D26B4E',
          active: '#BF5C41',
          light: '#FDF0EB',
          subtle: '#F7D8CE',
        },
        // Homepage 60-30-10 palette (public marketing surface only)
        navy: {
          DEFAULT: '#192A56', // 60% dominant background
          deep: '#101E3E',
          raised: '#22376B',
          border: '#33486F',
          muted: '#C9D3E8',
          text: '#F7F5F0',
        },
        rose: {
          DEFAULT: '#EDA6A3', // 30% secondary surfaces
          hover: '#E18F8B',
          light: '#F6C9C6',
          subtle: '#FBE4E2',
          muted: '#2C3E66',
        },
        gold: {
          DEFAULT: '#F2B84B', // 10% accent / primary actions
          hover: '#E3A62D',
          active: '#C98F1D',
          light: '#FCEBC8',
        },
        // Supporting - Forest Green: #2D4F1E
        forest: {
          DEFAULT: '#2D4F1E', // Brand Forest Green (Success / Verified / On Duty)
          hover: '#244018',
          light: '#EDF5EA',
          subtle: '#D8E8D2',
        },
        // Backwards compatibility aliases mapped to official Nivaro tokens
        walnut: {
          DEFAULT: '#4A4A4A',
          deep: '#2E2E2E',
          medium: '#6E6E6E',
          dark: '#242424',
          light: '#F5E6CC',
        },
        sage: {
          DEFAULT: '#2D4F1E',
          primary: '#2D4F1E',
          hover: '#244018',
          dark: '#1F3714',
          light: '#EDF5EA',
          border: '#D8E8D2',
        },
        amber: {
          DEFAULT: '#E27D60',
          glow: '#E27D60',
        },
        ivory: {
          DEFAULT: '#F5E6CC',
          background: '#F5E6CC',
          light: '#FAF3E7',
        },
        brandText: {
          main: '#2E2E2E',
          secondary: '#6E6E6E',
        },
        brandBorder: {
          DEFAULT: '#E0CEAF',
          subtle: '#E8D5B5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(74, 74, 74, 0.05), 0 1px 2px -1px rgba(74, 74, 74, 0.05)',
        hover: '0 4px 12px -2px rgba(74, 74, 74, 0.08), 0 2px 6px -1px rgba(74, 74, 74, 0.04)',
      }
    },
  },
  plugins: [],
}
