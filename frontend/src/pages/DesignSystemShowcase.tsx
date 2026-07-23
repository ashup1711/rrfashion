import React from 'react';

/**
 * Design System Showcase Component
 * 
 * This page demonstrates all the new design tokens from the migration plan:
 * - New elegant neutral color palette
 * - Refined typography scale
 * - New spacing system
 * - Border radius and shadow scales
 * 
 * Usage: Navigate to this page to verify all design tokens render correctly
 */

const DesignSystemShowcase: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-cream p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-hero-headline text-primary-900 mb-4">
            Design System Showcase
          </h1>
          <p className="text-section-subtitle text-neutral-dark">
            A comprehensive demonstration of the new elegant neutral design tokens
          </p>
        </header>

        {/* Color Palette Section */}
        <section className="mb-16">
          <h2 className="text-section-title text-primary-800 mb-8">Color Palette</h2>
          
          {/* Primary Colors */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-primary-700 mb-6">Primary Scale</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-11 gap-4">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => (
                <div key={shade} className="text-center">
                  <div className={`bg-primary-${shade} rounded-xl h-24 mb-2 flex items-center justify-center`}>
                    <span className="text-white text-caption font-mono bg-primary-950 bg-opacity-50 px-1 rounded">
                      {shade}
                    </span>
                  </div>
                  <p className="text-caption text-neutral-dark">{shade === 500 ? 'Primary' : ''}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Neutral Colors */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-primary-700 mb-6">Neutral Palette</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-neutral-white rounded-xl p-6 border border-neutral-medium">
                <p className="font-semibold">White</p>
                <p className="text-body-small text-neutral-dark mt-2">#FFFFFF</p>
              </div>
              <div className="bg-neutral-cream rounded-xl p-6">
                <p className="font-semibold text-primary-900">Cream</p>
                <p className="text-body-small text-neutral-dark mt-2">#F9F7F2</p>
              </div>
              <div className="bg-neutral-beige rounded-xl p-6">
                <p className="font-semibold text-primary-900">Beige</p>
                <p className="text-body-small text-neutral-dark mt-2">#E8DCD0</p>
              </div>
              <div className="bg-neutral-light rounded-xl p-6">
                <p className="font-semibold text-primary-900">Light</p>
                <p className="text-body-small text-neutral-dark mt-2">#F5F5F5</p>
              </div>
              <div className="bg-neutral-medium rounded-xl p-6">
                <p className="font-semibold text-primary-900">Medium</p>
                <p className="text-body-small text-neutral-dark mt-2">#E5E5E5</p>
              </div>
              <div className="bg-neutral-dark rounded-xl p-6">
                <p className="font-semibold text-neutral-white">Dark</p>
                <p className="text-body-small text-neutral-white mt-2">#666666</p>
              </div>
              <div className="bg-neutral-nearBlack rounded-xl p-6">
                <p className="font-semibold text-neutral-white">Near Black</p>
                <p className="text-body-small text-neutral-white mt-2">#1A1A1A</p>
              </div>
            </div>
          </div>
        </section>

        {/* Typography Section */}
        <section className="mb-16">
          <h2 className="text-section-title text-primary-800 mb-8">Typography</h2>
          
          <div className="space-y-6 mb-8">
            <div className="border-b border-neutral-medium pb-4">
              <p className="text-caption text-neutral-dark uppercase tracking-wider mb-2">Hero Eyebrow</p>
              <p className="text-hero-eyebrow text-primary-900">Elegant Fashion for Every Occasion</p>
            </div>
            <div className="border-b border-neutral-medium pb-4">
              <p className="text-caption text-neutral-dark uppercase tracking-wider mb-2">Hero Headline</p>
              <p className="text-hero-headline text-primary-900">Discover Timeless Style</p>
            </div>
            <div className="border-b border-neutral-medium pb-4">
              <p className="text-caption text-neutral-dark uppercase tracking-wider mb-2">Section Title</p>
              <p className="text-section-title text-primary-800">Featured Collections</p>
            </div>
            <div className="border-b border-neutral-medium pb-4">
              <p className="text-caption text-neutral-dark uppercase tracking-wider mb-2">Section Subtitle</p>
              <p className="text-section-subtitle text-neutral-dark">
                Curated selections for the discerning individual
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="text-section-subtitle font-semibold text-primary-700 mb-4">Product Text</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-caption text-neutral-dark mb-1">Product Title</p>
                  <p className="text-product-title text-primary-">Premium Cotton Kurta</p>
                </div>
                <div>
                  <p className="text-caption text-neutral-dark mb-1">Product Price</p>
                  <p className="text-product-price text-primary-600">₹1,299</p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-section-subtitle font-semibold text-primary-700 mb-4">Body Text</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-caption text-neutral-dark mb-1">Body</p>
                  <p className="text-body text-primary-900">
                    Experience the perfect blend of comfort and style with our premium collection.
                  </p>
                </div>
                <div>
                  <p className="text-caption text-neutral-dark mb-1">Body Small</p>
                  <p className="text-body-small text-primary-700">
                    Free shipping on orders above ₹999
                  </p>
                </div>
                <div>
                  <p className="text-caption text-neutral-dark mb-1">Caption</p>
                  <p className="text-caption text-neutral-dark">
                    *Terms and conditions apply
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-white rounded-xl p-6 border border-neutral-medium">
            <h4 className="text-section-subtitle font-semibold text-primary-700 mb-4">Letter Spacing</h4>
            <div className="space-y-3">
              <p className="tracking-tight text-body">Tracking Tight - Premium Collection</p>
              <p className="tracking-normal text-body">Tracking Normal - Premium Collection</p>
              <p className="tracking-wide text-body">Tracking Wide - Premium Collection</p>
              <p className="tracking-wider text-body">Tracking Wider - Premium Collection</p>
            </div>
          </div>
        </section>

        {/* Spacing & Layout System */}
        <section className="mb-16">
          <h2 className="text-section-title text-primary-800 mb-8">Spacing & Layout</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-primary-700 mb-4">Section Spacing</h3>
                <div className="bg-neutral-white rounded-xl p-8 border border-neutral-medium">
                  <div>This card uses page-section spacing (80px)</div>
                  <div className="bg-primary-50 h-1 mt-8"></div>
                  <div className="text-caption text-neutral-dark mt-2">80px margin</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-primary-700 mb-4">Card Padding</h3>
                <div className="bg-neutral-white rounded-xl p-card-padding border border-neutral-medium">
                  <div>This card uses card-padding (24px)</div>
                  <div className="bg-primary-50 h-1 mt-4"></div>
                  <div className="text-caption text-neutral-dark mt-2">24px padding</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-primary-700 mb-4">Card Gap</h3>
                <div className="flex gap-card-gap">
                  <div className="bg-primary-50 rounded-lg p-4 flex-1">Card 1</div>
                  <div className="bg-primary-50 rounded-lg p-4 flex-1">Card 2</div>
                </div>
                <div className="text-caption text-neutral-dark mt-2">30px gap between cards</div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-primary-700 mb-4">Border Radius Scale</h3>
                <div className="space-y-4">
                  <div className="bg-neutral-white rounded-sm p-4 border border-neutral-medium">
                    <p className="text-body-small">Rounded SM (4px)</p>
                  </div>
                  <div className="bg-neutral-white rounded-md p-4 border border-neutral-medium">
                    <p className="text-body-small">Rounded MD (8px)</p>
                  </div>
                  <div className="bg-neutral-white rounded-lg p-4 border border-neutral-medium">
                    <p className="text-body-small">Rounded LG (12px)</p>
                  </div>
                  <div className="bg-neutral-white rounded-xl p-4 border border-neutral-medium">
                    <p className="text-body-small">Rounded XL (16px)</p>
                  </div>
                  <div className="bg-neutral-white rounded-2xl p-4 border border-neutral-medium">
                    <p className="text-body-small">Rounded 2XL (24px)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-primary-700 mb-4">Shadow Scale</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-neutral-white rounded-xl p-6 shadow-sm border border-neutral-medium">
                <p className="text-body-small font-semibold mb-2">Shadow SM</p>
                <p className="text-caption text-neutral-dark">Subtle, light shadow</p>
              </div>
              <div className="bg-neutral-white rounded-xl p-6 shadow-md border border-neutral-medium">
                <p className="text-body-small font-semibold mb-2">Shadow MD</p>
                <p className="text-caption text-neutral-dark">Medium depth shadow</p>
              </div>
              <div className="bg-neutral-white rounded-xl p-6 shadow-lg border border-neutral-medium">
                <p className="text-body-small font-semibold mb-2">Shadow LG</p>
                <p className="text-caption text-neutral-dark">Large, prominent shadow</p>
              </div>
              <div className="bg-neutral-white rounded-xl p-6 shadow-xl border border-neutral-medium">
                <p className="text-body-small font-semibold mb-2">Shadow XL</p>
                <p className="text-caption text-neutral-dark">Extra large, dramatic shadow</p>
              </div>
            </div>
          </div>
        </section>

        {/* Component Examples */}
        <section className="mb-16">
          <h2 className="text-section-title text-primary-800 mb-8">Component Examples</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-card-gap mb-8">
            {/* Product Card Example */}
            <div className="bg-neutral-white rounded-2xl shadow-lg overflow-hidden border border-neutral-medium">
              <div className="bg-primary-50 h-64 flex items-center justify-center">
                <div className="text-primary-600 text-body">Product Image</div>
              </div>
              <div className="p-card-padding">
                <h3 className="text-product-title text-primary-900 mb-2">Elegant Silk Saree</h3>
                <p className="text-product-price text-primary-600 mb-4">₹2,499</p>
                <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg transition-colors duration-200">
                  Add to Cart
                </button>
              </div>
            </div>

            {/* Product Card 2 */}
            <div className="bg-neutral-white rounded-2xl shadow-lg overflow-hidden border border-neutral-medium">
              <div className="bg-neutral-light h-64 flex items-center justify-center">
                <div className="text-neutral-dark text-body">Product Image</div>
              </div>
              <div className="p-card-padding">
                <h3 className="text-product-title text-primary-900 mb-2">Premium Cotton Kurta</h3>
                <p className="text-product-price text-primary-600 mb-4">₹1,299</p>
                <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg transition-colors duration-200">
                  Add to Cart
                </button>
              </div>
            </div>

            {/* Product Card 3 */}
            <div className="bg-neutral-white rounded-2xl shadow-lg overflow-hidden border border-neutral-medium">
              <div className="bg-neutral-beige h-64 flex items-center justify-center">
                <div className="text-primary-700 text-body">Product Image</div>
              </div>
              <div className="p-card-padding">
                <h3 className="text-product-title text-primary-900 mb-2">Designer Lehenga</h3>
                <p className="text-product-price text-primary-600 mb-4">₹3,999</p>
                <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg transition-colors duration-200">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>

          {/* CTA Section Example */}
          <div className="bg-primary-50 rounded-2xl p-page-section shadow-md">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-hero-eyebrow text-primary-800 mb-4">
                New Collection Arrival
              </h2>
              <p className="text-section-subtitle text-neutral-dark mb-8">
                Discover our latest collection of premium ethnic wear, crafted with 
                attention to detail and timeless elegance.
              </p>
              <button className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200">
                Shop Now
              </button>
            </div>
          </div>
        </section>

        {/* Migration Notes */}
        <section className="bg-neutral-white rounded-2xl p-card-padding border border-neutral-medium">
          <h2 className="text-section-title text-primary-800 mb-6">Migration Notes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-section-subtitle font-semibold text-primary-700 mb-4">
                ✅ New Design Tokens Added
              </h3>
              <ul className="space-y-2 text-body">
                <li className="flex items-start">
                  <span className="text-success mr-2">✓</span>
                  <span>Primary palette (50-950)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-success mr-2">✓</span>
                  <span>Neutral palette (white, cream, beige, light, medium, dark, nearBlack)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-success mr-2">✓</span>
                  <span>Typography scale (hero-eyebrow, hero-headline, section-title, etc.)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-success mr-2">✓</span>
                  <span>Letter spacing utilities (tight, normal, wide, wider)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-success mr-2">✓</span>
                  <span>Spacing system (page-section, card-padding, card-gap)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-success mr-2">✓</span>
                  <span>Border radius scale (sm, md, lg, xl, 2xl)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-success mr-2">✓</span>
                  <span>Box shadow scale (sm, md, lg, xl)</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-section-subtitle font-semibold text-primary-700 mb-4">
                ⚠️ Deprecated Tokens (To Be Removed)
              </h3>
              <ul className="space-y-2 text-body">
                <li className="flex items-start">
                  <span className="text-warning mr-2">⚠</span>
                  <span>deep-maroon → Use primary.600 or primary.700</span>
                </li>
                <li className="flex items-start">
                  <span className="text-warning mr-2">⚠</span>
                  <span>mauve → Use primary.500</span>
                </li>
                <li className="flex items-start">
                  <span className="text-warning mr-2">⚠</span>
                  <span>pink-banner → Use primary.400</span>
                </li>
                <li className="flex items-start">
                  <span className="text-warning mr-2">⚠</span>
                  <span>pink-rose → Use primary.500</span>
                </li>
                <li className="flex items-start">
                  <span className="text-warning mr-2">⚠</span>
                  <span>section-heading → Use section-subtitle</span>
                </li>
                <li className="flex items-start">
                  <span className="text-warning mr-2">⚠</span>
                  <span>body-xs → Use caption</span>
                </li>
                <li className="flex items-start">
                  <span className="text-warning mr-2">⚠</span>
                  <span>card-title → Use product-title</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="mt-16 text-center">
          <p className="text-body-small text-neutral-dark">
            Design System Migration Complete • All new tokens are now available for use
          </p>
        </footer>
      </div>
    </div>
  );
};

export default DesignSystemShowcase;
