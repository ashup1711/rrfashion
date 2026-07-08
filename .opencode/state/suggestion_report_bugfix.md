# Suggestion Report: Product Detail Page Bug Fix

## Summary

The ProductInfo component implementation is solid and passes all QA requirements. This report identifies **14 actionable improvements** across 6 categories. The top 3 most valuable suggestions are:

1. **P1 - Add Error Logging**: Essential for production debugging, minimal effort
2. **P1 - Image Gallery with Thumbnails**: High UX impact, medium effort
3. **P2 - Stock Indicator per Variant**: Improves purchase confidence, small effort

---

## 1. Code Quality Improvements

### P1 - Remove Unused Variable
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Critical) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: Variable `isGuest` is declared at line 29 but never used.

**Why it matters**: Dead code increases bundle size and can confuse future maintainers.

**How to fix**:
```tsx
// Option A: Remove if not needed (recommended)
// Delete line 29

// Option B: Use for conditional UI enhancement
const isGuest = useCartStore((state) => state.isGuest);

// Then show a prompt for guests to sign in for better experience
{isGuest && (
  <p className="text-xs text-gray-500 mt-2">
    <Link to="/login" className="text-primary-600 hover:underline">
      Sign in
    </Link> to save your cart across devices
  </p>
)}
```

---

### P1 - Add Error Logging in Catch Blocks
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Critical) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: Caught errors at lines 147 and 183 are not logged, making production debugging difficult.

**Why it matters**: Without error logging, it's impossible to diagnose issues users encounter in production.

**How to fix**:
```tsx
// Line 147 - Add to Cart error handler
} catch (err) {
  console.error('Failed to add to cart:', err);
  setError('Failed to add to cart. Please try again.');
  clearMessages();
}

// Line 183 - Wishlist error handler
} catch (err) {
  console.error('Failed to add to wishlist:', err);
  setError('Failed to add to wishlist. Please try again.');
  clearMessages();
}
```

**Advanced option**: Integrate with error tracking service (Sentry, LogRocket):
```tsx
import * as Sentry from '@sentry/react';

} catch (err) {
  Sentry.captureException(err, { 
    tags: { component: 'ProductInfo', action: 'addToCart' },
    extra: { productId: product.id, variantId: selectedVariant?.id }
  });
  // ...
}
```

---

### P2 - Extract Magic Numbers to Constants
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Medium) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: Max quantity `10` at line 104 and message timeout `3000` at line 113 are hardcoded magic numbers.

**Why it matters**: Hardcoded values make configuration changes difficult and reduce code readability.

**How to fix**:
```tsx
// At the top of the file or in a constants file
const MAX_CART_QUANTITY = 10;
const MESSAGE_TIMEOUT_MS = 3000;

// Usage
const increaseQuantity = () => {
  setQuantity((q) => Math.min(MAX_CART_QUANTITY, q + 1));
};

const clearMessages = () => {
  setTimeout(() => {
    setError(null);
    setSuccessMessage(null);
  }, MESSAGE_TIMEOUT_MS);
};
```

---

### P2 - Fix Potential Memory Leak in setTimeout
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Medium) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: The `clearMessages` function uses `setTimeout` without cleanup. If the component unmounts before the timeout fires, it may cause memory leaks or React warnings.

**Why it matters**: Prevents memory leaks and React "setState on unmounted component" warnings.

**How to fix**:
```tsx
import { useState, useMemo, useEffect, useRef } from 'react';

// Inside component
const timeoutRef = useRef<NodeJS.Timeout | null>(null);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, []);

// Update clearMessages
const clearMessages = () => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }
  timeoutRef.current = setTimeout(() => {
    setError(null);
    setSuccessMessage(null);
  }, MESSAGE_TIMEOUT_MS);
};
```

---

### P3 - Add useCallback for Event Handlers
| Attribute | Value |
|-----------|-------|
| **Priority** | P3 (Low) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: Event handlers (`handleSizeSelect`, `handleColorSelect`, `handleAddToCart`, `handleWishlist`) are recreated on every render.

**Why it matters**: Minor performance improvement; prevents unnecessary re-renders if child components receive these as props.

**How to fix**:
```tsx
import { useState, useMemo, useCallback } from 'react';

const handleSizeSelect = useCallback((size: string) => {
  setSelectedSize(size);
  setSelectedColor(null);
}, []);

const handleColorSelect = useCallback((color: string) => {
  setSelectedColor(color);
}, []);

const handleAddToCart = useCallback(async () => {
  // ... existing logic
}, [selectedVariant, isAuthenticated, quantity, purchaseType, product, addItem]);
```

---

## 2. User Experience Enhancements

### P1 - Image Gallery with Multiple Product Images
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Critical) |
| **Effort** | Medium |
| **Layer** | Frontend |

**Issue**: ProductDetail only displays the first image. Products may have multiple images in `product.images` array.

**Why it matters**: Multiple product images significantly improve purchase confidence and reduce return rates.

**How to implement**:

1. **Create an ImageGallery component**:
```tsx
// frontend/src/pages/ProductDetail/components/ImageGallery.tsx
interface ImageGalleryProps {
  images: string[];
  product_name: string;
  selectedVariantImages?: ProductImage[];
}

const ImageGallery = ({ images, productName, selectedVariantImages }: ImageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const displayImages = selectedVariantImages?.length 
    ? selectedVariantImages.map(img => img.url) 
    : images;

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
        <img
          src={displayImages[selectedIndex]}
          alt={`${productName} - View ${selectedIndex + 1}`}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`flex-shrink-0 w-16 h-20 rounded-md overflow-hidden border-2 transition-colors ${
                selectedIndex === idx ? 'border-primary-500' : 'border-transparent'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

2. **Update ProductDetail/index.tsx**:
```tsx
import ImageGallery from './components/ImageGallery';

// Replace the current image div with:
<ImageGallery 
  images={product.images} 
  productName={product.name}
  selectedVariantImages={selectedVariant?.images}
/>
```

---

### P2 - Stock Availability Indicator per Variant
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Medium) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: Users can't see stock availability per variant before selection.

**Why it matters**: Shows urgency for low-stock items, improves purchase confidence.

**How to implement**:
```tsx
// Add to the size selector buttons (around line 290-301)
{sizes.map((size) => {
  // Check if any variant with this size has stock
  const hasStock = product.variants?.some(
    (v) => v.isActive && v.size === size && v.stock > 0
  );
  
  return (
    <button
      key={size}
      onClick={() => handleSizeSelect(size)}
      disabled={!hasStock}
      className={`min-w-[40px] h-10 px-3 border rounded-md text-sm font-medium transition-colors ${
        selectedSize === size
          ? 'border-primary-500 text-primary-600 bg-primary-50'
          : !hasStock
          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
          : 'border-gray-300 text-gray-700 hover:border-primary-500'
      }`}
    >
      {size}
      {!hasStock && <span className="ml-1 text-xs">(Out)</span>}
    </button>
  );
})}
```

**Note**: This requires `stock` field on `ProductVariant` type. If not present, the backend would need to expose this data.

---

### P2 - Size Guide Modal
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Medium) |
| **Effort** | Medium |
| **Layer** | Frontend |

**Issue**: Users can't reference size measurements before purchasing.

**Why it matters**: Reduces returns from incorrect sizing, improves customer confidence.

**How to implement**:
```tsx
// Add Size Guide link near size selector
<div className="mt-8">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-semibold text-gray-900">
      Size {selectedSize && <span className="font-normal text-gray-500">({selectedSize})</span>}
    </h3>
    <button 
      onClick={() => setShowSizeGuide(true)}
      className="text-sm text-primary-600 hover:underline"
    >
      Size Guide
    </button>
  </div>
  {/* ... size buttons ... */}
</div>

// Use existing Modal component
<Modal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)}>
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">Size Guide</h3>
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="py-2 text-left">Size</th>
          <th className="py-2 text-left">Bust (in)</th>
          <th className="py-2 text-left">Waist (in)</th>
          <th className="py-2 text-left">Hip (in)</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b"><td className="py-2">S</td><td>32-34</td><td>26-28</td><td>34-36</td></tr>
        <tr className="border-b"><td className="py-2">M</td><td>34-36</td><td>28-30</td><td>36-38</td></tr>
        <tr className="border-b"><td className="py-2">L</td><td>36-38</td><td>30-32</td><td>38-40</td></tr>
        <tr><td className="py-2">XL</td><td>38-40</td><td>32-34</td><td>40-42</td></tr>
      </tbody>
    </table>
  </div>
</Modal>
```

---

### P2 - Social Sharing Buttons
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Medium) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: No way to share product with friends/family.

**Why it matters**: Social sharing drives organic traffic and increases conversion.

**How to implement**:
```tsx
// Add near product name or actions
const shareUrl = window.location.href;
const shareText = `Check out ${product.name} at rrFashion!`;

<div className="flex items-center gap-2 mt-4">
  <span className="text-sm text-gray-500">Share:</span>
  <button
    onClick={() => navigator.share?.({ title: product.name, url: shareUrl }) || 
      navigator.clipboard.writeText(shareUrl)}
    className="p-2 text-gray-500 hover:text-primary-600"
    aria-label="Share product"
  >
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  </button>
</div>
```

---

### P3 - Wishlist Toggle State
| Attribute | Value |
|-----------|-------|
| **Priority** | P3 (Low) |
| **Effort** | Medium |
| **Layer** | Frontend |

**Issue**: Wishlist button doesn't show if item is already in wishlist.

**Why it matters**: Users need to know their wishlist status; prevents duplicate additions.

**How to implement**:
```tsx
// Add to store connections
const wishlistItems = useWishlistStore((state) => state.items);
const isInWishlist = wishlistItems.some(item => item.variantId === selectedVariant?.id);

// Update button
<Button
  variant={isInWishlist ? 'primary' : 'outline'}
  size="lg"
  onClick={handleWishlist}
  disabled={!canAddToCart || isInWishlist}
  aria-label={isInWishlist ? 'Already in wishlist' : 'Add to wishlist'}
>
  <svg
    className="w-5 h-5"
    fill={isInWishlist ? 'currentColor' : 'none'}
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    {/* ... path ... */}
  </svg>
</Button>
```

---

## 3. Performance Optimizations

### P2 - Image Lazy Loading
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Medium) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: Product images load immediately without lazy loading.

**Why it matters**: Improves initial page load time, especially on slow connections.

**How to fix**:
```tsx
// In ImageGallery or ProductDetail
<img
  src={displayImages[selectedIndex]}
  alt={`${productName} - View ${selectedIndex + 1}`}
  loading="lazy"
  className="w-full h-full object-cover"
/>

// For thumbnails
{displayImages.map((img, idx) => (
  <img 
    key={idx} 
    src={img} 
    loading="lazy" 
    className="w-full h-full object-cover" 
  />
))}
```

---

### P3 - Component Lazy Loading
| Attribute | Value |
|-----------|-------|
| **Priority** | P3 (Low) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: ProductReviews component loads synchronously even though it's below the fold.

**Why it matters**: Reduces initial bundle size, improves Time to Interactive.

**How to fix**:
```tsx
// In ProductDetail/index.tsx
import { lazy, Suspense } from 'react';

const ProductReviews = lazy(() => import('./components/ProductReviews'));

// In JSX
<Suspense fallback={<div className="h-32 animate-pulse bg-gray-100 rounded-lg" />}>
  <ProductReviews productId={id} />
</Suspense>
```

---

### P3 - Debounced Quantity Updates
| Attribute | Value |
|-----------|-------|
| **Priority** | P3 (Low) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: If quantity updates trigger API calls in the future, rapid clicks could cause multiple requests.

**Why it matters**: Prevents API spam, improves server performance.

**Future consideration**:
```tsx
import { useMemo, useCallback } from 'react';
import { debounce } from 'lodash-es';

// If quantity needs to sync with server
const debouncedUpdateQuantity = useMemo(
  () => debounce((variantId: string, quantity: number) => {
    updateCartItem(variantId, quantity);
  }, 300),
  []
);
```

---

## 4. Accessibility Improvements

### P2 - Enhanced ARIA Labels
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Medium) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: Some interactive elements lack proper ARIA labels or roles.

**Why it matters**: Screen reader users can't understand component state changes.

**How to fix**:
```tsx
// Size selector
<div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Select size">
  {sizes.map((size) => (
    <button
      key={size}
      role="radio"
      aria-checked={selectedSize === size}
      onClick={() => handleSizeSelect(size)}
      className={/* ... */}
    >
      {size}
    </button>
  ))}
</div>

// Color selector
<div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Select color">
  {colorsForSize.map((color) => (
    <button
      key={color}
      role="radio"
      aria-checked={selectedColor === color}
      onClick={() => handleColorSelect(color)}
      className={/* ... */}
    >
      {color}
    </button>
  ))}
</div>

// Purchase type toggle
<div role="radiogroup" aria-label="Select purchase type">
  {/* ... */}
</div>
```

---

### P2 - Live Region for Dynamic Content
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Medium) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: Error and success messages appear without screen reader announcement.

**Why it matters**: Screen reader users may miss important feedback.

**How to fix**:
```tsx
// Error message
{error && (
  <div 
    role="alert" 
    aria-live="assertive"
    className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md"
  >
    <p className="text-sm text-red-600">{error}</p>
  </div>
)}

// Success message
{successMessage && (
  <div 
    role="status" 
    aria-live="polite"
    className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md"
  >
    <p className="text-sm text-green-600">{successMessage}</p>
  </div>
)}
```

---

### P3 - Focus Management
| Attribute | Value |
|-----------|-------|
| **Priority** | P3 (Low) |
| **Effort** | Medium |
| **Layer** | Frontend |

**Issue**: Focus isn't managed after variant selection or cart actions.

**Why it matters**: Keyboard users may lose context after interactions.

**How to implement**:
```tsx
import { useRef, useEffect } from 'react';

// Focus success/error message when it appears
const messageRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if ((error || successMessage) && messageRef.current) {
    messageRef.current.focus();
  }
}, [error, successMessage]);

// In JSX
<div 
  ref={messageRef}
  tabIndex={-1}
  role="alert"
  className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md outline-none"
>
  <p className="text-sm text-green-600">{successMessage}</p>
</div>
```

---

### P3 - Color Selector Visual Indication
| Attribute | Value |
|-----------|-------|
| **Priority** | P3 (Low) |
| **Effort** | Small |
| **Layer** | Frontend |

**Issue**: Color names are shown as text, but visual color swatches would be more intuitive.

**Why it matters**: Color swatches provide immediate visual feedback and match e-commerce conventions.

**How to implement**:
```tsx
// Create a color map for common colors
const COLOR_HEX_MAP: Record<string, string> = {
  'Black': '#000000',
  'White': '#FFFFFF',
  'Red': '#EF4444',
  'Blue': '#3B82F6',
  'Green': '#10B981',
  'Yellow': '#F59E0B',
  'Pink': '#EC4899',
  'Navy': '#1E3A5F',
  // Add more as needed
};

// In color selector
{colorsForSize.map((color) => (
  <button
    key={color}
    onClick={() => handleColorSelect(color)}
    className={`px-4 h-10 border rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
      selectedColor === color
        ? 'border-primary-500 text-primary-600 bg-primary-50'
        : 'border-gray-300 text-gray-700 hover:border-primary-500'
    }`}
  >
    {COLOR_HEX_MAP[color] && (
      <span 
        className="w-4 h-4 rounded-full border border-gray-300"
        style={{ backgroundColor: COLOR_HEX_MAP[color] }}
        aria-hidden="true"
      />
    )}
    {color}
  </button>
))}
```

---

## 5. Testing Recommendations

### P1 - Unit Tests for Variant Selection Logic
| Attribute | Value |
|-----------|-------|
| **Priority** | P1 (Critical) |
| **Effort** | Medium |
| **Layer** | Frontend |

**Why it matters**: Variant selection is core functionality; bugs here affect purchases.

**Tests to write**:
```tsx
// frontend/src/pages/ProductDetail/__tests__/ProductInfo.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ProductInfo from '../components/ProductInfo';

describe('ProductInfo', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Dress',
    basePrice: 1000,
    variants: [
      { id: 'v1', size: 'S', color: 'Red', isActive: true, sku: 'SKU-S-R' },
      { id: 'v2', size: 'M', color: 'Red', isActive: true, sku: 'SKU-M-R' },
      { id: 'v3', size: 'M', color: 'Blue', isActive: true, sku: 'SKU-M-B' },
    ],
    images: [],
    isRentable: false,
    isSellable: true,
  };

  it('extracts unique sizes from variants', () => {
    render(<ProductInfo product={mockProduct} />);
    expect(screen.getByRole('button', { name: /S/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /M/i })).toBeInTheDocument();
  });

  it('shows colors only after size selection', () => {
    render(<ProductInfo product={mockProduct} />);
    expect(screen.queryByRole('radiogroup', { name: /color/i })).not.toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: /M/i }));
    expect(screen.getByRole('radiogroup', { name: /color/i })).toBeInTheDocument();
  });

  it('filters colors by selected size', () => {
    render(<ProductInfo product={mockProduct} />);
    
    fireEvent.click(screen.getByRole('button', { name: /S/i }));
    expect(screen.getByRole('button', { name: /Red/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Blue/i })).not.toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: /M/i }));
    expect(screen.getByRole('button', { name: /Red/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Blue/i })).toBeInTheDocument();
  });

  it('disables Add to Cart until variant selected', () => {
    render(<ProductInfo product={mockProduct} />);
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
    
    fireEvent.click(screen.getByRole('button', { name: /M/i }));
    fireEvent.click(screen.getByRole('button', { name: /Red/i }));
    expect(screen.getByRole('button', { name: /add to cart/i })).not.toBeDisabled();
  });
});
```

---

### P2 - Integration Tests for Cart Flow
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Medium) |
| **Effort** | Medium |
| **Layer** | Frontend |

**Why it matters**: Cart integration affects revenue; must work for both guest and auth users.

**Tests to write**:
```tsx
// frontend/src/pages/ProductDetail/__tests__/ProductInfo.cart.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductInfo from '../components/ProductInfo';

// Mock APIs
jest.mock('../../../api/cart', () => ({
  addCartItem: jest.fn().mockResolvedValue({ id: 'cart-1' }),
}));

jest.mock('../../../api/wishlist', () => ({
  addToWishlist: jest.fn().mockResolvedValue({ id: 'wishlist-1' }),
}));

describe('ProductInfo - Cart Integration', () => {
  it('adds item to guest cart via store', async () => {
    renderWithProviders(<ProductInfo product={mockProduct} />, { isAuthenticated: false });
    
    // Select variant
    fireEvent.click(screen.getByRole('button', { name: /M/i }));
    fireEvent.click(screen.getByRole('button', { name: /Red/i }));
    
    // Add to cart
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/added to cart/i)).toBeInTheDocument();
    });
  });

  it('calls API for authenticated user', async () => {
    const { addCartItem } = require('../../../api/cart');
    
    renderWithProviders(<ProductInfo product={mockProduct} />, { isAuthenticated: true });
    
    fireEvent.click(screen.getByRole('button', { name: /M/i }));
    fireEvent.click(screen.getByRole('button', { name: /Red/i }));
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
    
    await waitFor(() => {
      expect(addCartItem).toHaveBeenCalledWith('v2', 1, 'sale');
    });
  });
});
```

---

### P2 - E2E Tests for Product Page
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Medium) |
| **Effort** | Medium |
| **Layer** | Frontend |

**Why it matters**: E2E tests catch integration issues that unit tests miss.

**Tests to write** (using Playwright or Cypress):
```tsx
// e2e/product-detail.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Product Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products/test-product-1');
  });

  test('displays product information', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Test Product');
    await expect(page.getByText(/category/i)).toBeVisible();
  });

  test('variant selection flow', async ({ page }) => {
    // Select size
    await page.click('button:has-text("M")');
    
    // Verify color options appear
    await expect(page.getByRole('radiogroup', { name: /color/i })).toBeVisible();
    
    // Select color
    await page.click('button:has-text("Red")');
    
    // Verify Add to Cart is enabled
    await expect(page.getByRole('button', { name: /add to cart/i })).toBeEnabled();
  });

  test('add to cart as guest', async ({ page }) => {
    await page.click('button:has-text("M")');
    await page.click('button:has-text("Red")');
    await page.click('button:has-text("Add to Cart")');
    
    await expect(page.getByText(/added to cart/i)).toBeVisible();
    
    // Verify cart icon updated
    await expect(page.getByTestId('cart-count')).toContainText('1');
  });
});
```

---

## 6. Future Feature Enhancements

### P2 - Product Recommendations
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Medium) |
| **Effort** | Large |
| **Layer** | Cross-stack |

**Description**: Show related products based on category, brand, or user behavior.

**Why it matters**: Increases average order value through cross-selling.

**Implementation approach**:
1. Backend: Add `/products/:id/recommendations` endpoint
2. Use collaborative filtering or category-based matching
3. Frontend: Display carousel below product details
4. Consider using a recommendation service (Algolia, Recombee)

---

### P2 - Recently Viewed Products
| Attribute | Value |
|-----------|-------|
| **Priority** | P2 (Medium) |
| **Effort** | Medium |
| **Layer** | Frontend |

**Description**: Track and display recently viewed products for easy navigation.

**Why it matters**: Helps users compare products and return to previous selections.

**Implementation approach**:
```tsx
// store/recentlyViewedStore.ts
import { create } from 'zustand';

interface RecentlyViewedState {
  products: Product[];
  addProduct: (product: Product) => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>((set) => ({
  products: JSON.parse(localStorage.getItem('recently_viewed') || '[]'),
  addProduct: (product) => set((state) => {
    const filtered = state.products.filter(p => p.id !== product.id);
    const updated = [product, ...filtered].slice(0, 10);
    localStorage.setItem('recently_viewed', JSON.stringify(updated));
    return { products: updated };
  }),
}));

// In ProductDetail
useEffect(() => {
  if (product) {
    useRecentlyViewedStore.getState().addProduct(product);
  }
}, [product]);
```

---

### P3 - Size Persistence Across Sessions
| Attribute | Value |
|-----------|-------|
| **Priority** | P3 (Low) |
| **Effort** | Small |
| **Layer** | Frontend |

**Description**: Remember user's preferred size for future visits.

**Why it matters**: Improves UX by pre-selecting likely size options.

**Implementation approach**:
```tsx
// Store last selected size in localStorage
const SIZE_PREFERENCE_KEY = 'user_size_preference';

const handleSizeSelect = (size: string) => {
  setSelectedSize(size);
  setSelectedColor(null);
  localStorage.setItem(SIZE_PREFERENCE_KEY, size);
};

// On mount, check for saved preference
useEffect(() => {
  const savedSize = localStorage.getItem(SIZE_PREFERENCE_KEY);
  if (savedSize && sizes.includes(savedSize)) {
    setSelectedSize(savedSize);
  }
}, [sizes]);
```

---

### P3 - Notify When Back in Stock
| Attribute | Value |
|-----------|-------|
| **Priority** | P3 (Low) |
| **Effort** | Medium |
| **Layer** | Cross-stack |

**Description**: Allow users to sign up for stock notifications on out-of-stock items.

**Why it matters**: Recovers potentially lost sales; shows customer interest data.

**Implementation approach**:
1. Backend: Add `notifyOnRestock` to Wishlist model
2. Create notification service (email/push)
3. Frontend: Show "Notify Me" button for out-of-stock variants
4. Backend job to notify when stock updates

---

### P3 - Compare Products Feature
| Attribute | Value |
|-----------|-------|
| **Priority** | P3 (Low) |
| **Effort** | Large |
| **Layer** | Cross-stack |

**Description**: Allow users to compare multiple products side-by-side.

**Why it matters**: Helps users make informed purchase decisions.

**Implementation approach**:
1. Create comparison store for selected products (max 4)
2. Add "Compare" checkbox on product cards
3. Create comparison page/modal with table view
4. Highlight differences between products

---

## Quick Wins (High Value, Low Effort)

| # | Suggestion | Priority | Effort | Impact |
|---|------------|----------|--------|--------|
| 1 | Add error logging in catch blocks | P1 | Small | Essential for production debugging |
| 2 | Remove unused `isGuest` variable | P1 | Small | Code cleanliness |
| 3 | Add ARIA live regions for messages | P2 | Small | Accessibility compliance |
| 4 | Add image lazy loading | P2 | Small | Performance improvement |
| 5 | Extract magic numbers to constants | P2 | Small | Maintainability |

---

## Summary Table

| Category | P1 | P2 | P3 | Total |
|----------|----|----|----| ----- |
| Code Quality | 2 | 2 | 1 | 5 |
| User Experience | 1 | 3 | 1 | 5 |
| Performance | 0 | 1 | 2 | 3 |
| Accessibility | 0 | 2 | 2 | 4 |
| Testing | 1 | 2 | 0 | 3 |
| Future Features | 0 | 2 | 3 | 5 |
| **Total** | **4** | **12** | **9** | **25** |

---

## Conclusion

The ProductInfo component implementation is solid and production-ready. The most critical improvements are the P1 items: adding error logging for production debugging and removing the unused variable. The P2 items, particularly the image gallery and stock indicators, would significantly enhance user experience. The P3 items are nice-to-have improvements that can be addressed in future iterations.

All suggestions are actionable with clear implementation paths. Prioritization should be based on business impact and available development resources.
