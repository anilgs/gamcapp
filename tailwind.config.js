/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy primary colors (keeping for backward compatibility)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Primary Medical Blue (Professional Healthcare)
        medical: {
          50: '#E6F3FF',
          100: '#CCE7FF', 
          200: '#99CFFF',
          300: '#66B7FF',
          400: '#339FFF',
          500: '#0066CC',    // Main brand color
          600: '#0052A3',
          700: '#003D7A',
          800: '#002952',
          900: '#001429'
        },
        // Healthcare Green (Success, Health, Wellness)
        health: {
          50: '#E6F7ED',
          100: '#CCEFDB',
          200: '#99DEB7',
          300: '#66CE93',
          400: '#33BD6F',
          500: '#00A859',    // Success green
          600: '#008647',
          700: '#006435',
          800: '#004324',
          900: '#002112'
        },
        // Clinical Gray (Clean, Professional)
        clinical: {
          50: '#FAFBFC',
          100: '#F8F9FA',    // Background
          200: '#F1F3F4',
          300: '#E8EAED',
          400: '#DADCE0',
          500: '#9AA0A6',
          600: '#80868B',
          700: '#5F6368',
          800: '#3C4043',
          900: '#202124'
        },
        // Accent Orange (CTAs, Highlights)
        accent: {
          50: '#FFF4E6',
          100: '#FFE9CC',
          200: '#FFD399',
          300: '#FFBD66',
          400: '#FFA733',
          500: '#FF6B35',    // Primary accent
          600: '#E55A2B',
          700: '#CC4921',
          800: '#B23817',
          900: '#99270D'
        }
      },
      fontFamily: {
        'medical': ['Inter', 'system-ui', 'sans-serif'],
        'brand': ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'medical': '0 4px 6px -1px rgba(0, 102, 204, 0.1), 0 2px 4px -1px rgba(0, 102, 204, 0.06)',
        'medical-lg': '0 10px 15px -3px rgba(0, 102, 204, 0.1), 0 4px 6px -2px rgba(0, 102, 204, 0.05)',
        'health': '0 4px 6px -1px rgba(0, 168, 89, 0.1), 0 2px 4px -1px rgba(0, 168, 89, 0.06)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
