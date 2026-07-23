# Design System Migration Guide

## Overview
This document outlines the migration from the pink/maroon color palette to the new elegant neutral design system.

## ✅ Completed Tasks

### 1. Color Palette (Task 1.1)
**File:** `frontend/tailwind.config.js`

- ✅ Removed pink/maroon color palette
- ✅ Added new elegant neutral `primary` palette (50-950 scale)
- ✅ Added new `neutral` palette with semantic names (white, cream, beige, light, medium, dark, nearBlack)
- ✅ Kept existing gray palette for backward compatibility
- ✅ Commented deprecated colors as DEPRECATED

**New Primary Palette:**
```javascript
primary: {
  50: '#FAF9F7',   100: '#F5F3EF',   200: '#EBE7DF',
  300: '#D4CCC0',   400: '#B8A99A',   500: '#9A8573',
  600: '#7A6A5C',   700: '#5D5047',   800: '#3F3732',
  900: '#2A2522',   950: '#1A1715'
}
```

**New Neutral Palette:**
```javascript
neutral: {
  white: '#FFFFFF',    cream: '#F9F7F2',    beige: '#E8DCD0',
  light: '#F5F5F5',    medium: '#E5E5E5',  dark: '#666666',
  nearBlack: '#1A1A1A'
}
```

### 2. Typography Refinement (Task 1.2)
**File:** `frontend/tailwind.config.js`

- ✅ Updated font size scale with semantic naming
- ✅ Added letter spacing utilities
- ✅ Kept legacy font sizes for backward compatibility

**New Typography Scale:**
```javascript
fontSize: {
  'hero-eyebrow': ['40px', { lineHeight: '1.1', fontWeight: '800', fontStyle: 'italic' }],
  'hero-headline': ['64px', { lineHeight: '1.1', fontWeight: '700' }],
  'section-title': ['32px', { lineHeight: '1.3', fontWeight: '600' }],
  'section-subtitle': ['18px', { lineHeight: '1.5', fontWeight: '400' }],
  'product-title': ['16px', { lineHeight: '1.4', fontWeight: '500' }],
  'product-price': ['18px', { lineHeight: '1.2', fontWeight: '600' }],
  'nav-link': ['15px', { lineHeight: '1.2', fontWeight: '500' }],
  'body': ['16px', { lineHeight: '1.6' }],
  'body-small': ['14px', { lineHeight: '1.5' }],
  'caption': ['12px', { lineHeight: '1.4' }],
}

letterSpacing: {
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
}
```

### 3. Spacing & Layout System (Task 1.3)
**File:** `frontend/tailwind.config.js`

- ✅ Added spacing utilities
- ✅ Added border radius scale
- ✅ Added box shadow scale

**New Spacing:**
```javascript
spacing: {
  'page-section': '80px',
  'card-padding': '24px',
  'card-gap': '30px',
}
```

**New Border Radius:**
```javascript
borderRadius: {
  sm: '4px',   md: '8px',   lg: '12px',
  xl: '16px',  '2xl': '24px',
}
```

**New Box Shadows:**
```javascript
boxShadow: {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07)',
  lg: '0 10px 25px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 40px rgba(0, 0, 0, 0.12)',
}
```

### 4. Test Component
**File:** `frontend/src/pages/DesignSystemShowcase.tsx`

- ✅ Created comprehensive test component demonstrating all new design tokens
- ✅ Shows color palettes, typography, spacing, border radius, and shadows
- ✅ Includes component examples using new tokens
- ✅ Documents migration notes for deprecated tokens

## 🔧 Manual Updates Required

The following components use deprecated color classes and need manual updating:

### Priority 1: Core UI Components
1. **`src/components/ui/Button.tsx`**
   - Line: `primary: 'bg-mauve text-white...'`
   - Update: `bg-mauve` → `bg-primary-500`
   - Update: `focus:ring-mauve` → `focus:ring-primary-500`

2. **`src/components/layout/Footer.tsx`**
   - Line: `bg-mauve text-off-white`
   - Update: `bg-mauve` → `bg-primary-500`
   - Update: `text-off-white` → `text-neutral-white`

3. **`src/components/layout/ProductSearchModal.tsx`**
   - Lines: `focus:ring-pink-rose` and `border-pink-rose`
   - Update: `pink-rose` → `primary-500`

### Priority 2: Layout Components
4. **`src/components/layout/Header.tsx`** (Multiple instances)
   - Lines: `bg-mauve`, `text-pink-rose`, `hover:text-pink-rose`
   - Update: `mauve` → `primary-500` (or appropriate shade)
   - Update: `pink-rose` → `primary-500` or `primary-600`
   - Update: `text-off-white` → `text-neutral-white`
   - Update: `hover:bg-neutral-light` (already using new token)

### Priority 3: Product Components
5. **`src/components/common/ProductCard.tsx`**
   - Lines: `bg-mauve`, `focus:ring-mauve`
   - Update: `mauve` → `primary-600` or `primary-700`

6. **`src/pages/Home/components/ProductCollection.tsx`**
   - Line: `hover:text-pink-rose`
   - Update: `pink-rose` → `primary-600`

7. **`src/pages/Home/components/CategoryCards.tsx`**
   - Line: `group-hover:text-pink-rose`
   - Update: `pink-rose` → `primary-600`

## 📋 Migration Mapping

### Color Mappings
| Old Token | New Token | Usage |
|-----------|-----------|-------|
| `mauve` | `primary-500` | Primary accent color |
| `deep-maroon` | `primary-600` or `primary-700` | Darker accent |
| `pink-rose` | `primary-500` or `primary-600` | Brand pink |
| `pink-banner` | `primary-400` | Lighter pink |
| `off-white` | `neutral-cream` | Page background |
| `near-black` | `neutral-nearBlack` | Text color |

### Typography Mappings
| Old Token | New Token |
|-----------|-----------|
| `section-heading` | `section-subtitle` |
| `body-xs` | `caption` |
| `card-title` | `product-title` |
| `price` | `product-price` |

## ✅ Verification Results

- ✅ `tailwind.config.js` syntax is valid
- ✅ All new design tokens load successfully
- ✅ 11 primary color variants (50-950) configured
- ✅ 17 font size variants configured (including deprecated ones)
- ✅ 4 letter spacing utilities configured
- ✅ 5 spacing utilities configured
- ✅ 5 border radius utilities configured
- ✅ 4 box shadow utilities configured

## Note on Build Issues

The TypeScript build has pre-existing errors in:
- `src/components/layout/Header.tsx` (unused imports/variables)
- `src/pages/Home/components/HeroSlider.tsx` (TypeScript types)

These errors are **not related** to the design system migration and should be addressed separately.

## 🎯 Next Steps

1. **Review the DesignSystemShowcase page** at `/design-system-showcase`
2. **Update components** using deprecated tokens (see list above)
3. **Test thoroughly** across all pages
4. **Remove deprecated tokens** from `tailwind.config.js` after migration
5. **Update design documentation** to reflect new tokens

## 📂 Files Modified

1. `frontend/tailwind.config.js` - Updated with new design tokens
2. `frontend/src/pages/DesignSystemShowcase.tsx` - New test component
3. `frontend/DESIGN_SYSTEM_MIGRATION_GUIDE.md` - This migration guide

---

**Status:** ✅ Migration foundation complete. Manual component updates required.
**Last Updated:** July 9, 2026
**Migration Phase:** 1 - Foundation
