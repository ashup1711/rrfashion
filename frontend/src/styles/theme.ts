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
} as const;

export const typography = {
  h1: 'text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl',
  h2: 'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl',
  h3: 'text-2xl font-semibold text-gray-900 sm:text-3xl',
  h4: 'text-xl font-semibold text-gray-900',
  body: 'text-base text-gray-600 leading-relaxed',
  bodyLarge: 'text-lg text-gray-600 leading-relaxed',
  small: 'text-sm text-gray-500',
  caption: 'text-xs text-gray-400',
} as const;
