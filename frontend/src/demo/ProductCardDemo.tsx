import ProductCard from '../components/common/ProductCard';
import type { Product } from '../types/product';

// Demo showcasing ProductCard in various states
const ProductCardDemo = () => {
  // Sample products showing different card states
  const sampleProducts: Product[] = [
    {
      id: 'demo-sale-product',
      name: 'Premium Cotton Kurta with Embroidery',
      slug: 'premium-cotton-kurta',
      basePrice: 3499,
      salePrice: 2449,
      images: [
        'https://via.placeholder.com/319x406/9A8573/FFFFFF?text=Product+1+Front',
        'https://via.placeholder.com/319x406/5D5047/FFFFFF?text=Product+1+Back',
      ],
      stock: 15,
      isFeatured: false,
      isActive: true,
      isRentable: true,
      isSellable: true,
      sortPriority: 1,
      categoryId: 'category-1',
      category: { id: 'category-1', name: 'Kurtas', slug: 'kurtas', sortOrder: 1, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      brand: { id: 'brand-1', name: 'Modave', isActive: true },
      variants: [
        {
          id: 'variant-1-1',
          productId: 'demo-sale-product',
          size: 'M',
          color: 'Wine',
          sku: 'SKU001',
          salePrice: 2449,
          rentPricePerDay: 150,
          weightGrams: 200,
          isActive: true,
          images: [
            { id: 'img-1', url: 'https://via.placeholder.com/319x406/9A8573/FFFFFF', altText: 'Wine', sortOrder: 1, variantType: 'ORIGINAL' as const },
          ],
        },
        {
          id: 'variant-1-2',
          productId: 'demo-sale-product',
          size: 'L',
          color: 'Navy',
          sku: 'SKU002',
          salePrice: 2449,
          rentPricePerDay: 150,
          weightGrams: 200,
          isActive: true,
          images: [
            { id: 'img-2', url: 'https://via.placeholder.com/319x406/5D5047/FFFFFF', altText: 'Navy', sortOrder: 1, variantType: 'ORIGINAL' as const },
          ],
        },
      ],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'demo-new-product',
      name: 'Silk Blend Anarkali Dress',
      slug: 'silk-blend-anarkali',
      basePrice: 5999,
      salePrice: 5999,
      images: [
        'https://via.placeholder.com/319x406/EBE7DF/000000?text=Product+2',
      ],
      stock: 8,
      isFeatured: true, // NEW badge
      isActive: true,
      isRentable: true,
      isSellable: true,
      sortPriority: 2,
      categoryId: 'category-2',
      category: { id: 'category-2', name: 'Dresses', slug: 'dresses', sortOrder: 1, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      brand: { id: 'brand-2', name: 'Ethereal', isActive: true },
      variants: [
        {
          id: 'variant-2-1',
          productId: 'demo-new-product',
          size: 'S',
          color: 'Royal Blue',
          sku: 'SKU003',
          salePrice: 5999,
          rentPricePerDay: 200,
          weightGrams: 250,
          isActive: true,
          images: [
            { id: 'img-3', url: 'https://via.placeholder.com/319x406/EBE7DF/000000', altText: 'Royal Blue', sortOrder: 1, variantType: 'ORIGINAL' as const },
          ],
        },
      ],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'demo-low-stock',
      name: 'Handwoven Banarasi Saree',
      slug: 'handwoven-banarasi-saree',
      basePrice: 12999,
      salePrice: 12999,
      images: [
        'https://via.placeholder.com/319x406/B8A99A/000000?text=Product+3',
      ],
      stock: 2, // Low Stock
      isFeatured: false,
      isActive: true,
      isRentable: true,
      isSellable: true,
      sortPriority: 3,
      categoryId: 'category-3',
      category: { id: 'category-3', name: 'Sarees', slug: 'sarees', sortOrder: 1, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      variants: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'demo-out-of-stock',
      name: 'Designer Lehenga Choli Set',
      slug: 'designer-lehenga-choli',
      basePrice: 19999,
      salePrice: 13999,
      images: [
        'https://via.placeholder.com/319x406/D4CCC0/FFFFFF?text=Product+4',
      ],
      stock: 0, // Out of Stock
      isFeatured: false,
      isActive: true,
      isRentable: true,
      isSellable: true,
      sortPriority: 4,
      categoryId: 'category-4',
      category: { id: 'category-4', name: 'Lehengas', slug: 'lehengas', sortOrder: 1, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      brand: { id: 'brand-3', name: 'Royal', isActive: true },
      variants: [
        {
          id: 'variant-4-1',
          productId: 'demo-out-of-stock',
          size: 'M',
          color: 'Red',
          sku: 'SKU004',
          salePrice: 13999,
          rentPricePerDay: 300,
          weightGrams: 500,
          isActive: true,
          images: [
            { id: 'img-4', url: 'https://via.placeholder.com/319x406/D4CCC0/FFFFFF', altText: 'Red', sortOrder: 1, variantType: 'ORIGINAL' as const },
          ],
        },
      ],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  return (
    <div className="p-8 bg-neutral-cream min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-nearBlack mb-2">
          Enhanced ProductCard Component Demo
        </h1>
        <p className="text-neutral-dark mb-8">
          Hover over cards to see enhanced animations and quick actions
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {sampleProducts.map((product) => (
            <div key={product.id}>
              <ProductCard product={product} />
              <div className="mt-2 text-xs text-gray-500 text-center">
                {product.stock === 0 && '📦 Out of Stock | '}
                {product.isFeatured && '✨ NEW | '}
                {product.salePrice! < product.basePrice && '💰 On Sale | '}
                {product.stock <= 5 && product.stock > 0 && '⚠️ Low Stock'}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-nearBlack mb-4">
            Features Implemented
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-neutral-dark">
            <div>
              <h3 className="font-semibold mb-2">🎨 Visual Enhancements</h3>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Image zoom on hover (scale 1.05)</li>
                <li>Secondary image swap on hover/touch</li>
                <li>Enhanced shadows and transitions</li>
                <li>Smooth fade animations</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">⚡ Quick Actions</h3>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Heart icon (existing) - Wishlist toggle</li>
                <li>Eye icon (NEW) - Quick View modal</li>
                <li>Compare icon (NEW) - Add to compare</li>
                <li>Size dropdown (NEW) - Quick add to cart</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🏷️ Badges & Labels</h3>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Sale badge with percentage off</li>
                <li>NEW badge for featured products</li>
                <li>Stock status badges</li>
                <li>Positioned at top-left corner</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🌈 Color Swatches</h3>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Circular swatches (20px)</li>
                <li>Click to change images</li>
                <li>+N indicator for extra colors</li>
                <li>Smooth hover transitions</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📊 Additional Features</h3>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Strikethrough original price on sale</li>
                <li>Star rating display</li>
                <li>Brand name displayed</li>
                <li>Touch-friendly mobile behavior</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📱 Mobile Support</h3>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Touch-friendly interactions</li>
                <li>44px minimum touch targets</li>
                <li>Tap to show quick actions</li>
                <li>Swipe/tap image for secondary view</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCardDemo;