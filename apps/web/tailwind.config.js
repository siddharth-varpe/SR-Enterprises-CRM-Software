/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Authoritative SR Enterprises CRM Palette
        workspace: '#F8FAFC',
        surface: '#FFFFFF',
        sidebar: {
          DEFAULT: '#00152B',
          navy: '#00152B',
          active: '#C1121F',
          hover: 'rgba(255, 255, 255, 0.06)',
          darker: '#000F1F',
          lighter: '#001E3D',
          indigo: '#1E1B4B',
          blue: '#172554',
        },
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5', // Primary Accent
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB', // Supporting Action Blue
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        input: '8px',
        btn: '8px',
        card: '12px',
        modal: '16px',
        panel: '20px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.06)',
        elevated: '0 8px 24px rgba(15, 23, 42, 0.08)',
        modal: '0 20px 50px rgba(15, 23, 42, 0.15)',
        dropdown: '0 4px 20px rgba(15, 23, 42, 0.10)',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        smooth: '250ms',
      },
    },
  },
  plugins: [],
};
