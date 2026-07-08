# Final Requirement Prompt: Product Detail Page Bug Fix

## User's Original Request
> Fix broken product detail page - ProductInfo component shows hardcoded placeholder data instead of actual product information. Product images may not be loading. Size selector, quantity selector, Add to Cart, and Wishlist buttons are non-functional. Both the customer product page and admin product management should work together properly.

## Orchestrator's Design Summary
The Product Detail page at `/products/:id` is completely non-functional. The `ProductInfo` component displays hardcoded placeholder content instead of actual product data, and all interactive features (size selection, quantity selection, Add to Cart, Wishlist) are broken. The root cause is that ProductInfo receives only a `productId` string prop instead of the full product object. No backend changes are required.

---

## What to Build

### Layer: Frontend (Only Layer Affected)

#### 1. Fix ProductDetail/index.tsx
- Change the prop passed to `ProductInfo` from `productId={id}` to `product={product}`
- The product data is already fetched via `useProduct(id!)` hook

#### 2. Complete Rewrite of ProductInfo.tsx
- Change props interface from `{ productId: string }` to `{ product: Product }`
- Display actual product data:
  - `product.name` instead of hardcoded "Product Name"
  - `product.category?.name` instead of hardcoded "Category"
  - `product.brand?.name` (optional display)
  - `product.description` instead of placeholder text
  - `product.fabric` and `product.careInstructions` in product details section
- Implement dynamic price display:
  - Show `salePrice` if available, otherwise `basePrice`
  - Show discount percentage when salePrice exists: `Math.round(((basePrice - salePrice) / basePrice) * 100)`
  - Show original price with strikethrough when on sale
  - Handle `rentPricePerDay` for rental products

#### 3. Implement Variant Selection
- Extract unique sizes from `product.variants` array
- Group variants by size, then by color
- Track selected size and color in local state
- Display variant-specific price when variant is selected (variant.salePrice overrides product.salePrice)
- Show variant images if available

#### 4. Implement Quantity Selection
- Local state for quantity (default: 1)
- Decrease button (min: 1)
- Increase button (max: use stock or reasonable limit like 10)
- Display current quantity

#### 5. Connect Add to Cart Functionality
- Use `useCartStore` for guest cart management
- Use `addCartItem` API for authenticated users
- Determine auth status via `useAuthStore(state => state.isAuthenticated)`
- Determine guest status via `useCartStore(state => state.isGuest)`
- Required data for cart item:
  - `productId: product.id`
  - `variantId: selectedVariant.id`
  - `name: product.name`
  - `basePrice: product.basePrice`
  - `salePrice: selectedVariant.salePrice || product.salePrice`
  - `image: product.images[0]`
  - `quantity: quantity`
  - `type: 'sale' | 'rent'` (based on `product.isRentable`)

#### 6. Connect Wishlist Functionality
- Use `useWishlistStore` for guest wishlist
- Use `addToWishlist` API for authenticated users
- Wishlist requires a selected variant (variantId)
- Show toggle state (filled heart if in wishlist)

#### 7. Badge Display Logic
- Show "Sale" badge when `product.salePrice` exists
- Show "New Arrival" badge when `product.isFeatured` is true (and not on sale)
- Show "Rentable" badge when `product.isRentable` is true

#### 8. Product Images
- Display first image from `product.images[0]` (already working in parent)
- Future enhancement: Display variant-specific images when variant selected

---

## How to Build It (Codebase Conventions)

### React Component Conventions to Follow

- **Component Structure**: Functional components with explicit interface definitions before the component
  ```tsx
  // From ProductInfo.tsx (current)
  interface ProductInfoProps {
    productId: string;
  }
  
  const ProductInfo = ({ productId }: ProductInfoProps) => {
  ```

- **Import Style**: Group imports by type (React, external libs, internal modules, types, utils)
  ```tsx
  // From ProductCard.tsx
  import { Link } from 'react-router-dom';
  import type { Product } from '../../types/product';
  import { formatCurrencyCompact } from '../../utils/formatCurrency';
  import { ROUTES } from '../../utils/constants';
  ```

- **State Management with Zustand**: Use selectors for derived state
  ```tsx
  // From cartStore.ts
  export const useCartStore = create<CartState>((set) => ({
    items: loadGuestCart(),
    itemCount: loadGuestCart().reduce((sum, i) => sum + i.quantity, 0),
    // ...
  }));
  
  // Usage pattern (from authStore.ts)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  ```

- **React Query Hooks**: Use the existing pattern from useProducts.ts
  ```tsx
  // From useProducts.ts
  export const useProduct = (id: string) => {
    return useQuery({
      queryKey: [QUERY_KEYS.product, id],
      queryFn: () => getProduct(id),
      enabled: !!id,
    });
  };
  ```

- **API Client Usage**: Import from api/ files, use apiClient which handles auth tokens automatically
  ```tsx
  // From cart.ts
  export const addCartItem = async (variantId: string, quantity: number, type?: string): Promise<Cart> => {
    const { data } = await apiClient.post<Cart>('/cart/add', { variantId, quantity, type: type || 'sale' });
    return data;
  };
  ```

- **Price Formatting**: Use the existing formatCurrency utility
  ```tsx
  // From formatCurrency.ts
  export const formatCurrency = (amount: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  };
  ```

- **Button Component Usage**: Use the shared Button component with variant and size props
  ```tsx
  // From Button.tsx
  type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  type ButtonSize = 'sm' | 'md' | 'lg';
  
  // Usage
  <Button size="lg" className="flex-1">Add to Cart</Button>
  <Button variant="outline" size="lg">Wishlist</Button>
  ```

- **Badge Component Usage**: Use for status indicators
  ```tsx
  // From Badge.tsx
  type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
  
  // Usage
  <Badge variant="info">New Arrival</Badge>
  <Badge variant="danger">Sale</Badge>
  ```

- **Tailwind CSS Styling**: Use existing utility classes and patterns
  ```tsx
  // Common patterns from ProductCard.tsx
  className="text-lg font-semibold text-primary-600"
  className="text-sm text-gray-400 line-through"
  className="mt-2 flex items-center gap-2"
  ```

- **Error Handling**: Display user-friendly error messages
  ```tsx
  // From ProductDetail/index.tsx
  if (error || !product) {
    return (
      <div className="container-page py-8">
        <p className="text-gray-500">Product not found.</p>
      </div>
    );
  }
  ```

---

## Exact Files to Modify/Create

### Files to MODIFY
| File Path | What to Change | Existing Pattern |
|-----------|---------------|-----------------|
| `frontend/src/pages/ProductDetail/index.tsx` | Change `<ProductInfo productId={id} />` to `<ProductInfo product={product} />` | Parent already fetches product data |
| `frontend/src/pages/ProductDetail/components/ProductInfo.tsx` | Complete rewrite with actual functionality | Currently shows hardcoded placeholder data |

### Files to REFERENCE (No Changes)
| File Path | Purpose |
|-----------|---------|
| `frontend/src/store/cartStore.ts` | Cart state management pattern |
| `frontend/src/store/wishlistStore.ts` | Wishlist state management pattern |
| `frontend/src/store/authStore.ts` | Auth state for isAuthenticated check |
| `frontend/src/api/cart.ts` | addCartItem API function |
| `frontend/src/api/wishlist.ts` | addToWishlist API function |
| `frontend/src/types/product.ts` | Product and ProductVariant types |
| `frontend/src/utils/formatCurrency.ts` | Price formatting utility |
| `frontend/src/components/ui/Button.tsx` | Button component |
| `frontend/src/components/ui/Badge.tsx` | Badge component |
| `frontend/src/components/common/ProductCard.tsx` | Price display pattern reference |

---

## Exact Contracts (API, Data, UI)

### Backend API Contract (Verified Working)

#### GET /products/:id
Returns full product with variants, category, and brand:
```typescript
{
  id: string;
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  salePrice?: number;
  images: string[];
  stock: number;
  isFeatured: boolean;
  isActive: boolean;
  isRentable: boolean;
  isSellable: boolean;
  fabric?: string;
  hsnCode?: string;
  careInstructions?: string;
  sortPriority: number;
  categoryId: string;
  category?: { id: string; name: string; slug: string };
  brandId?: string;
  brand?: { id: string; name: string; description?: string };
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}
```

#### ProductVariant Structure
```typescript
{
  id: string;
  productId: string;
  size: string;
  color: string;
  sku: string;
  barcode?: string;
  salePrice?: number;
  rentPricePerDay?: number;
  securityDeposit?: number;
  weightGrams?: number;
  isActive: boolean;
  images: ProductImage[];
  createdAt?: string;
  updatedAt?: string;
}
```

#### POST /cart/add
```typescript
// Request
{
  variantId: string;
  quantity: number;
  type: 'sale' | 'rent';  // defaults to 'sale'
}

// Response
{
  id?: string;
  items: CartItem[];
  itemCount?: number;
  total: number;
}
```

#### POST /wishlist
```typescript
// Request
{
  variantId: string;
  notifyOnPriceDrop?: boolean;
}

// Response
{
  id: string;
  userId: string;
  variantId: string;
  variant: { id, size, color, sku, salePrice, product: { id, name, slug, images } };
  notifyOnRestock: boolean;
  notifyOnPriceDrop: boolean;
  createdAt: string;
}
```

### Frontend Store Contracts

#### CartStore addItem
```typescript
// From cartStore.ts lines 21-30
interface CartItemState {
  productId: string;
  variantId?: string;
  name: string;
  basePrice: number;
  salePrice?: number;
  image: string;
  quantity: number;
  type?: string;
}

// Usage
addItem: (item: CartItemState) => void;
```

#### WishlistStore addGuestItem
```typescript
// From wishlistStore.ts lines 3-9
interface WishlistItem {
  variantId: string;
  productId?: string;
  name?: string;
  image?: string;
  price?: number;
}

// Usage
addGuestItem: (item: WishlistItem) => void;
```

### UI Component Requirements

#### ProductInfo Component Structure
```tsx
interface ProductInfoProps {
  product: Product;  // Changed from productId: string
}

// Internal state needed:
const [selectedSize, setSelectedSize] = useState<string | null>(null);
const [selectedColor, setSelectedColor] = useState<string | null>(null);
const [quantity, setQuantity] = useState(1);
const [isAddingToCart, setIsAddingToCart] = useState(false);
const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);

// Store connections:
const addItem = useCartStore(state => state.addItem);
const isGuest = useCartStore(state => state.isGuest);
const isAuthenticated = useAuthStore(state => state.isAuthenticated);
const addGuestWishlistItem = useWishlistStore(state => state.addGuestItem);
```

---

## Potential Pitfalls & Warnings

### 1. Variant Selection Requires Variant ID
- **Issue**: Cart and Wishlist APIs require `variantId`, not `productId`
- **Resolution**: User MUST select a variant (size + color) before adding to cart/wishlist
- **Implementation**: Disable Add to Cart/Wishlist buttons until variant is selected, or show selection prompt

### 2. Guest vs Authenticated User Flow
- **Issue**: Different code paths for guest (localStorage) vs authenticated (API)
- **Resolution**: Check `isAuthenticated` from authStore, then use appropriate flow:
  ```tsx
  if (isAuthenticated) {
    await addCartItem(selectedVariant.id, quantity, type);
  } else {
    addItem({ ...itemData });  // guest cart store
  }
  ```

### 3. Price Display Hierarchy
- **Issue**: Multiple price sources (product.basePrice, product.salePrice, variant.salePrice)
- **Resolution**: Price priority: `selectedVariant.salePrice` > `product.salePrice` > `product.basePrice`

### 4. Out of Stock Handling
- **Issue**: Product or variant may be out of stock
- **Resolution**: Check `variant.isActive` and potentially track stock at variant level. Show "Out of Stock" message and disable Add to Cart if no active variants available.

### 5. Wishlist Requires Selected Variant
- **Issue**: Wishlist API requires variantId, but user might want to wishlist any variant
- **Resolution**: Either require variant selection first, or add the first available variant to wishlist

### 6. Rental Products
- **Issue**: Products can be `isRentable`, `isSellable`, or both
- **Resolution**: 
  - If only `isSellable`: type = 'sale'
  - If only `isRentable`: type = 'rent', show rentPricePerDay
  - If both: Add type selector (Buy/Rent toggle) before Add to Cart

### 7. Admin Compatibility
- **Issue**: Admin product management uses the same API endpoints
- **Resolution**: No backend changes required. Admin pages (ProductForm, ProductList) work with the same Product type and API responses. They already properly use `useProduct` and `useProductVariants` hooks.

---

## Research Confidence

**Confidence**: High

**Reason**: 
1. All relevant files have been read and analyzed
2. API contracts are verified from backend controller and service code
3. Store patterns are clear and well-documented in existing code
4. Type definitions are complete and accurate
5. The issue is clearly identified (ProductInfo receives productId instead of product object)
6. No backend changes required - all APIs are working correctly
7. Admin compatibility verified - ProductForm uses same types and hooks

---

## Implementation Checklist for react-expert

### Step 1: Update ProductDetail/index.tsx
- [ ] Change `<ProductInfo productId={id} />` to `<ProductInfo product={product} />`

### Step 2: Rewrite ProductInfo.tsx
- [ ] Update props interface to accept `product: Product`
- [ ] Add state for variant selection (size, color)
- [ ] Add state for quantity
- [ ] Add store connections (cartStore, wishlistStore, authStore)
- [ ] Implement unique size extraction from variants
- [ ] Implement color grouping for selected size
- [ ] Implement price display logic (sale vs base, variant vs product)
- [ ] Implement discount percentage calculation
- [ ] Implement quantity controls
- [ ] Implement Add to Cart handler (guest vs auth)
- [ ] Implement Wishlist handler (guest vs auth)
- [ ] Add proper loading states for buttons
- [ ] Add error handling with user feedback
- [ ] Display actual product data (name, category, brand, description, fabric, care)
- [ ] Display appropriate badges (Sale, New Arrival, Rentable)
- [ ] Handle edge cases (no variants, out of stock, rental products)
