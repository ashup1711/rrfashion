/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#500724',
        },
        deep: {
          maroon: '#7f052d',
        },
        mauve: {
          DEFAULT: '#9a6680',
        },
        pink: {
          banner: '#e79cb9',
          rose: '#e66291',
        },
        off: {
          white: '#f0f0f0',
        },
        near: {
          black: '#151515',
        },
        'lightest-gray': '#f5f5f5',
        divider: '#d9d9d9',
        // Neutral gray palette
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Semantic colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'Nunito Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Playfair Display', 'Inter', 'serif'],
      },
      fontSize: {
        // Hero section
        'hero-eyebrow': ['40px', { lineHeight: '1.1', fontWeight: '800', fontStyle: 'italic' }],
        'hero-headline': ['64px', { lineHeight: '1.1', fontWeight: '700' }],

        // Section headings
        'section-heading': ['20px', { lineHeight: '1.3', fontWeight: '500' }],

        // Body text scale
        'body': ['18px', { lineHeight: '1.5' }],
        'body-small': ['14px', { lineHeight: '1.5' }],
        'body-xs': ['12px', { lineHeight: '1.4' }],

        // Navigation
        'nav-link': ['20px', { lineHeight: '1.2' }],

        // Cards
        'card-title': ['18px', { lineHeight: '1.3', fontWeight: '500' }],
        'price': ['18px', { lineHeight: '1.2' }],

        // Buttons
        'button': ['16px', { lineHeight: '1.2', fontWeight: '500' }],

        // Footer
        'footer-heading': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'footer-link': ['18px', { lineHeight: '1.5' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      width: {
        'category-card': '236px',
        'product-card': '319px',
        'newsletter-input': '651px',
      },
      height: {
        'topbar': '80px',
        'hero-banner': '576px',
        'category-card': '173px',
        'product-card': '536px',
        'product-image': '406px',
        'newsletter-input': '78px',
      },
    },
  },
  plugins: [],
};
