/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // New elegant neutral palette - PRIMARY COLORS (warm beige/brown)
        primary: {
          50: '#FAF9F7',
          100: '#F5F3EF',
          200: '#EBE7DF',
          300: '#D4CCC0',
          400: '#B8A99A',
          500: '#9A8573',    // Primary accent
          600: '#7A6A5C',
          700: '#5D5047',
          800: '#3F3732',
          900: '#2A2522',
          950: '#1A1715',
        },
        // Accent colors for CTAs and highlights (complementary deep teal)
        accent: {
          50: '#EFF6F5',
          100: '#D7EDE9',
          200: '#B0DBD4',
          300: '#7CC4B8',
          400: '#4DA89A',
          500: '#2D8C7E',
          600: '#1F6E64',
          700: '#1A5951',
          800: '#184942',
          900: '#173C38',
          950: '#082824',
        },
        // Extended NEUTRAL PALETTE
        neutral: {
          white: '#FFFFFF',
          cream: '#F9F7F2',
          beige: '#E8DCD0',
          light: '#F5F5F5',
          medium: '#E5E5E5',
          dark: '#666666',
          nearBlack: '#1A1A1A',
        },
        // Legacy gray palette - keep for backward compatibility during migration
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
        // TO BE REMOVED in next cleanup phase:
        // These are the old pink/maroon colors (DEPRECATED)
        // deep: {
        //   maroon: '#7f052d', // DEPRECATED - Use primary.600-700 instead
        // },
        // mauve: {
        //   DEFAULT: '#9a6680', // DEPRECATED - Use primary.500 instead
        // },
        // pink: {
        //   banner: '#e79cb9', // DEPRECATED - Use primary.400 instead
        //   rose: '#e66291',   // DEPRECATED - Use primary.500 instead
        // },
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
      // New refined typography scale
      fontSize: {
        // Hero section
        'hero-eyebrow': ['40px', { lineHeight: '1.1', fontWeight: '800', fontStyle: 'italic' }],
        'hero-headline': ['64px', { lineHeight: '1.1', fontWeight: '700' }],
        
        // Section headings
        'section-title': ['32px', { lineHeight: '1.3', fontWeight: '600' }],
        'section-subtitle': ['18px', { lineHeight: '1.5', fontWeight: '400' }],
        
        // Product display
        'product-title': ['16px', { lineHeight: '1.4', fontWeight: '500' }],
        'product-price': ['18px', { lineHeight: '1.2', fontWeight: '600' }],
        
        // Navigation
        'nav-link': ['15px', { lineHeight: '1.2', fontWeight: '500' }],
        
        // Body content
        'body': ['16px', { lineHeight: '1.6' }],
        'body-small': ['14px', { lineHeight: '1.5' }],
        
        // Captions and metadata
        'caption': ['12px', { lineHeight: '1.4' }],
        
        // LEGACY - Kept for backward compatibility during migration (DEPRECATED)
        'section-heading': ['20px', { lineHeight: '1.3', fontWeight: '500' }], // DEPRECATED - Use section-subtitle
        'body-xs': ['12px', { lineHeight: '1.4' }], // DEPRECATED - Use caption
        'card-title': ['18px', { lineHeight: '1.3', fontWeight: '500' }], // DEPRECATED - Use product-title
        'price': ['18px', { lineHeight: '1.2' }], // DEPRECATED - Use product-price
        'button': ['16px', { lineHeight: '1.2', fontWeight: '500' }], // DEPRECATED - Use body with fontWeight
        'footer-heading': ['24px', { lineHeight: '1.3', fontWeight: '600' }], // DEPRECATED
        'footer-link': ['18px', { lineHeight: '1.5' }], // DEPRECATED
      },
      // NEW: Font weights with semantic naming
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      // NEW: Letter spacing
      letterSpacing: {
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
      },
      // NEW: Spacing system
      spacing: {
        // Page and section spacing
        'page-section': '80px',
        
        // Card spacing
        'card-padding': '24px',
        'card-gap': '30px',
        
        // LEGACY - Kept for backward compatibility during migration (DEPRECATED)
        '18': '4.5rem',
        '22': '5.5rem',
      },
      // NEW: Border radius scale
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      // NEW: Box shadow scale
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px rgba(0, 0, 0, 0.07)',
        lg: '0 10px 25px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 40px rgba(0, 0, 0, 0.12)',
      },
      // Width scale
      width: {
        // Legacy values kept for backward compatibility - will be replaced with new spacing system
        'category-card': '236px',
        'product-card': '319px',
        'newsletter-input': '651px',
      },
      // Height scale
      height: {
        // Legacy values kept for backward compatibility - will be replaced with new spacing system
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
