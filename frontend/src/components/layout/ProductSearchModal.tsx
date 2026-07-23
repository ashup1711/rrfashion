import { useState, useCallback, useEffect, useRef } from 'react';
import Modal from '../ui/Modal';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, ROUTES } from '../../utils/constants';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
}

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRENDING_KEYWORDS = ['Cotton Kurti', 'Silk Saree', 'Designer Gown', 'Kundan Necklace', 'Anarkali'];
const CATEGORIES = ['Kurti', 'Gown', 'Saree', 'Jewellery'];

const RECENTLY_VIEWED_KEY = 'rrf_recently_viewed';

const ProductSearchModal = ({ isOpen, onClose }: ProductSearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Load search history and recently viewed from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const history = localStorage.getItem('rrf_search_history');
        if (history) setSearchHistory(JSON.parse(history));
        
        const viewed = localStorage.getItem(RECENTLY_VIEWED_KEY);
        if (viewed) setRecentlyViewed(JSON.parse(viewed));
      } catch { /* ignore */ }
      
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setSelectedCategory('');
      setActiveSuggestionIndex(-1);
    }
  }, [isOpen]);
  
  // Mock search function
  const searchProducts = useCallback(async (): Promise<Product[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const mockProducts: Product[] = [
      { id: '1', name: 'Embroidered Silk Kurta', category: 'Kurti', price: 2999, image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=80&h=80&q=80' },
      { id: '2', name: 'Designer Anarkali Gown', category: 'Gown', price: 4599, image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=80&h=80&q=80' },
      { id: '3', name: 'Banarasi Silk Saree', category: 'Saree', price: 5999, image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&w=80&h=80&q=80' },
      { id: '4', name: 'Antique Kundan Necklace', category: 'Jewellery', price: 3499, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=80&h=80&q=80' },
      { id: '5', name: 'Cotton Printed Kurti', category: 'Kurti', price: 1299, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=80&h=80&q=80' },
    ];
    
    if (!searchQuery.trim()) return [];
    
    return mockProducts.filter(product => {
      const matchesQuery = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.products, 'search', searchQuery, selectedCategory],
    queryFn: searchProducts,
    enabled: isOpen && searchQuery.trim().length > 0,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setActiveSuggestionIndex(-1);
  };

  const handleProductClick = () => {
    // Save to search history
    if (searchQuery.trim()) {
      try {
        const updated = [searchQuery, ...searchHistory.filter(s => s !== searchQuery)].slice(0, 5);
        localStorage.setItem('rrf_search_history', JSON.stringify(updated));
      } catch { /* ignore */ }
    }
    onClose();
    setSearchQuery('');
  };

  const handleKeywordClick = (keyword: string) => {
    setSearchQuery(keyword);
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    try { localStorage.removeItem('rrf_search_history'); } catch { /* ignore */ }
  };

  // Keyboard navigation
  const suggestions = searchResults || [];
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
      e.preventDefault();
      const product = suggestions[activeSuggestionIndex];
      if (product) {
        handleProductClick();
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Products">
      <div className="space-y-6">
        {/* Search Input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="Search for products..."
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoFocus
            aria-label="Search products"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              !selectedCategory
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-light text-neutral-dark hover:bg-primary-100 hover:text-primary-600'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(selectedCategory === category ? '' : category)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-light text-neutral-dark hover:bg-primary-100 hover:text-primary-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Search Results */}
        <AnimatePresence mode="wait">
          <div className="space-y-3" key="results">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center py-8"
              >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </motion.div>
            ) : searchQuery.trim().length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Search History */}
                {searchHistory.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recent Searches
                      </p>
                      <button
                        onClick={handleClearHistory}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {searchHistory.map((term) => (
                        <button
                          key={term}
                          onClick={() => handleKeywordClick(term)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-neutral-light text-neutral-nearBlack rounded-full hover:bg-primary-100 hover:text-primary-700 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Keywords */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                    Trending Now
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TRENDING_KEYWORDS.map((keyword) => (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => handleKeywordClick(keyword)}
                        className="px-3 py-1 text-xs bg-neutral-light text-neutral-nearBlack rounded-full hover:bg-primary-100 hover:text-primary-700 transition-colors"
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recently Viewed */}
                {recentlyViewed.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                      Recently Viewed
                    </p>
                    <div className="space-y-2">
                      {recentlyViewed.slice(0, 3).map((product) => (
                        <Link
                          key={product.id}
                          to={ROUTES.PRODUCT_DETAIL(product.id)}
                          onClick={onClose}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-light transition-colors"
                        >
                          <div className="w-10 h-10 bg-neutral-light rounded-lg overflow-hidden flex-shrink-0">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 truncate">{product.name}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : searchResults && searchResults.length > 0 ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2 max-h-64 overflow-y-auto"
              >
                {searchResults.map((product, index) => (
                  <Link
                    key={product.id}
                    to={ROUTES.PRODUCT_DETAIL(product.id)}
                    onClick={handleProductClick}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                      index === activeSuggestionIndex
                        ? 'bg-primary-50 ring-1 ring-primary-200'
                        : 'hover:bg-neutral-light'
                    }`}
                  >
                    <div className="w-12 h-12 bg-neutral-light rounded-lg overflow-hidden flex-shrink-0">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-neutral-nearBlack truncate">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500">{product.category}</p>
                    </div>
                    <div className="text-sm font-medium text-neutral-nearBlack">
                      ₹{product.price}
                    </div>
                  </Link>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <p className="text-gray-500 mb-2">
                  No products found matching "{searchQuery}"
                </p>
                <p className="text-xs text-gray-400">
                  Try different keywords or browse our categories
                </p>
              </motion.div>
            )}
          </div>
        </AnimatePresence>

        {/* Popular Categories */}
        {!searchQuery.trim() && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Popular Categories
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <Link
                  key={category}
                  to={ROUTES.SHOP_CATEGORY(category.toLowerCase())}
                  onClick={onClose}
                  className="px-3 py-1 text-xs bg-neutral-light text-neutral-nearBlack rounded-full hover:bg-neutral-200 transition-colors"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ProductSearchModal;
