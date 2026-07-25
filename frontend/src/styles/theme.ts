export const colors = {
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
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
} as const;

export const spacing = {
  page: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  section: 'py-12 sm:py-16 lg:py-20',
  sectionSm: 'py-8 sm:py-12',
  gutter: 'px-4 sm:px-6 lg:px-8',
} as const;

export const typography = {
  /** Hero / Display — use sparingly, only for page hero sections */
  hero: 'text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 font-display leading-tight',
  /** Primary page heading */
  h1: 'text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 font-display leading-tight',
  /** Section heading */
  h2: 'text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 font-display leading-snug',
  /** Sub-section heading */
  h3: 'text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 font-display leading-snug',
  /** Card title / modal heading */
  h4: 'text-lg sm:text-xl font-semibold text-gray-900 leading-snug',
  /** Small section heading / label */
  h5: 'text-base sm:text-lg font-medium text-gray-900',
  /** Body text */
  body: 'text-sm sm:text-base text-gray-600 leading-relaxed',
  /** Larger body text for featured content */
  bodyLarge: 'text-base sm:text-lg text-gray-600 leading-relaxed',
  /** Secondary / helper text */
  small: 'text-xs sm:text-sm text-gray-500',
  /** Caption / metadata */
  caption: 'text-xs text-gray-400',
  /** Price display */
  price: 'text-lg sm:text-xl font-semibold text-gray-900',
  /** Sale price (accent color) */
  priceSale: 'text-lg sm:text-xl font-semibold text-red-600',
} as const;
