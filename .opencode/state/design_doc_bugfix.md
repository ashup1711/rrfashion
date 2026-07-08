# Bug Fix: Product Detail Page

## Issue Summary

The Product Detail page at `/products/:id` is completely non-functional. The `ProductInfo` component displays hardcoded placeholder content instead of actual product data, and all interactive features (size selection, quantity selection, Add to Cart, Wishlist) are broken.

## Root Cause Analysis

### 1. ProductInfo Component Design Flaw
The `ProductInfo` component receives only a `productId: string` prop but never fetches or receives the actual product data. The parent `ProductDetail` component fetches the product using React Query but only passes the ID string to ProductInfo.

**Current Implementation:**
```tsx
// ProductDetail/index.tsx
const { data: product, isLoading, error } = useProduct(id!);
// ...
<ProductInfo productId={id} />  // ❌ Only passing ID, not product data

// ProductInfo.tsx
const ProductInfo = ({ productId }: ProductInfoProps) => {
  return (
    <div>
      <h1>Product Name</h1>  // ❌ Hardcoded
      <p>Category</p>        // ❌ Hardcoded
      <p>{formatCurrency(1299)}</p>  // ❌ Hardcoded
      // ... all placeholder content
    </div>
  );
};
```

### 2. Missing Integrations
- **Cart Integration**: `cartStore` and `addCartItem` API exist but are not used
- **Wishlist Integration**: `wishlistStore` and `addToWishlist` API exist but are not used
- **Variant Selection**: Product variants exist in the data model but no selection UI

## Technical Design

### Frontend Changes Required

#### 1. Update ProductInfo Props
```typescript
interface ProductInfoProps {
  product: Product;  // ✅ Pass full product object
}

// In ProductDetail/index.tsx:
{product && <ProductInfo product={product} />}
```

#### 2. Implement Variant Selection
- Display available sizes from `product.variants`
- Track selected variant in local state
- Show color options for each size
- Update price based on selected variant

#### 3. Implement Quantity Selection
- Local state for quantity (default: 1)
- Increase/decrease buttons with validation
- Max quantity based on stock availability

#### 4. Connect Add to Cart
```typescript
// Use existing cart store
const addItem = useCartStore(state => state.addItem);
const isGuest = useCartStore(state => state.isGuest);

// On Add to Cart click:
if (isGuest) {
  addItem({
    productId: product.id,
    variantId: selectedVariant?.id,
    name: product.name,
    basePrice: product.basePrice,
    salePrice: selectedVariant?.salePrice || product.salePrice,
    image: product.images[0],
    quantity: quantity,
    type: product.isRentable ? 'rent' : 'sale'
  });
} else {
  // Use API for authenticated users
  await addCartItem(selectedVariant.id, quantity, type);
}
```

#### 5. Connect Wishlist
```typescript
// Use existing wishlist store
const addGuestItem = useWishlistStore(state => state.addGuestItem);

// On Wishlist click:
if (isGuest) {
  addGuestItem({
    variantId: selectedVariant.id,
    productId: product.id,
    name: product.name,
    image: product.images[0],
    price: selectedVariant.salePrice || product.basePrice
  });
} else {
  await addToWishlist(selectedVariant.id, true);
}
```

#### 6. Display Actual Product Data
- Name: `product.name`
- Category: `product.category?.name`
- Brand: `product.brand?.name`
- Description: `product.description`
- Price: Show `salePrice` if available, otherwise `basePrice`
- Badge: Show "Sale" badge if `salePrice` exists, "New Arrival" if `isFeatured`
- Fabric: `product.fabric`
- Care Instructions: `product.careInstructions`

### Component Structure

```
ProductDetail/
├── index.tsx (parent - fetches product)
│   ├── ProductImages (display multiple images)
│   └── ProductInfo (display product details & actions)
│       ├── ProductHeader (name, category, brand, badges)
│       ├── PriceDisplay (base/sale price with discount)
│       ├── VariantSelector (size + color)
│       ├── QuantitySelector
│       ├── ActionButtons (Add to Cart + Wishlist)
│       └── ProductDetails (description, fabric, care)
```

## No Backend Changes Required

The backend API endpoints are working correctly:
- `GET /products/:id` returns full product with variants, category, and brand
- `POST /cart/add` accepts variantId, quantity, and type
- `POST /wishlist` accepts variantId and notifyOnPriceDrop

## Success Criteria

1. ✅ Product page displays actual product name, not "Product Name"
2. ✅ Product page displays actual category and brand
3. ✅ Product page displays actual price (with sale price when applicable)
4. ✅ Product page displays actual description
5. ✅ Size selector shows available sizes from variants
6. ✅ Color selector shows available colors for selected size
7. ✅ Quantity selector works (increase/decrease)
8. ✅ Add to Cart button adds item to cart (guest or authenticated)
9. ✅ Wishlist button adds item to wishlist (guest or authenticated)
10. ✅ Product images load correctly
11. ✅ Admin product management continues to work (no backend changes)

## Files to Modify

1. `frontend/src/pages/ProductDetail/index.tsx` - Pass product object to ProductInfo
2. `frontend/src/pages/ProductDetail/components/ProductInfo.tsx` - Complete rewrite with actual functionality
3. Optional: Create sub-components for better organization:
   - `VariantSelector.tsx`
   - `QuantitySelector.tsx`
   - `PriceDisplay.tsx`
