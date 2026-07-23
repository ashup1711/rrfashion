import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ROUTES, CATEGORY_SLUGS } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlist } from '../../hooks/useWishlist';
import ProductSearchModal from './ProductSearchModal';

const NAV_ITEMS = [
  { 
    label: 'Home', 
    href: ROUTES.HOME,
    megaMenu: false
  },
  { 
    label: 'Kurti', 
    href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.KURTI),
    megaMenu: true,
    subItems: [
      { label: 'Long Kurti', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.LONG_KURTI) },
      { label: 'Short Kurti', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.SHORT_KURTI) },
      { label: 'Designer Kurti', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.KURTI) },
    ]
  },
  { 
    label: 'Gown', 
    href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.GOWN),
    megaMenu: true,
    subItems: [
      { label: 'Anarkali Gown', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.GOWN) },
      { label: 'Designer Gown', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.GOWN) },
      { label: 'Party Gown', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.GOWN) },
    ]
  },
  { 
    label: 'Saree', 
    href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.SAREE),
    megaMenu: true,
    subItems: [
      { label: 'Silk Saree', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.SAREE) },
      { label: 'Banarasi Saree', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.SAREE) },
      { label: 'Designer Saree', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.SAREE) },
    ]
  },
  { 
    label: 'Jewellery', 
    href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.JEWELLERY),
    megaMenu: true,
    subItems: [
      { label: 'Necklace', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.JEWELLERY) },
      { label: 'Earrings', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.JEWELLERY) },
      { label: 'Bangles', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.JEWELLERY) },
    ]
  },
];

// Animated hamburger icon that morphs to X
const AnimatedHamburger = ({ isOpen }: { isOpen: boolean }) => (
  <div className="w-6 h-6 relative flex items-center justify-center">
    <motion.span
      animate={isOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -5 }}
      className="absolute block w-5 h-0.5 bg-current rounded-full"
      transition={{ duration: 0.2 }}
    />
    <motion.span
      animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
      className="absolute block w-5 h-0.5 bg-current rounded-full"
      transition={{ duration: 0.15 }}
    />
    <motion.span
      animate={isOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 5 }}
      className="absolute block w-5 h-0.5 bg-current rounded-full"
      transition={{ duration: 0.2 }}
    />
  </div>
);

const Header = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const itemCount = useCartStore((state) => state.itemCount);
  const { items: wishlistItems } = useWishlist();
  const wishlistCount = wishlistItems.length;
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);
  const [openMobileSubmenu, setOpenMobileSubmenu] = useState<string | null>(null);

  const isActive = (href: string) => {
    if (href === ROUTES.HOME) return location.pathname === '/';
    return location.search.includes(href.split('=')[1]);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setOpenMobileSubmenu(null);
  };

  // Sticky header behavior with shadow on scroll + shrink effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mega menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.mega-menu-wrapper')) {
        setOpenMegaMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  return (
    <>
      <header 
        className={`bg-white sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? 'shadow-md header-shadow-scrolled' : 'shadow-sm header-shadow-transition'
        } ${isScrolled ? 'h-[64px]' : 'h-topbar'}`}
      >
        <div className="container-page h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo - Left aligned */}
            <Link to={ROUTES.HOME} className="flex items-center gap-3 flex-shrink-0">
              <div className={`flex items-center justify-center transition-all duration-300 ${
                isScrolled ? 'w-[40px]' : 'w-[120px]'
              }`}>
                <div className={`aspect-square bg-primary-500 rounded-lg flex items-center justify-center shadow-sm transition-all duration-300 ${
                  isScrolled ? 'w-8' : 'w-full'
                }`}>
                  <span className="text-white font-display font-bold text-xl">RR</span>
                </div>
              </div>
              <span className={`hidden sm:block font-display font-bold transition-all duration-300 ${
                isScrolled ? 'text-xl' : 'text-2xl'
              } text-neutral-nearBlack`}>
                RR FASHION
              </span>
            </Link>

            {/* Desktop Navigation - Center aligned */}
            <nav className="hidden lg:flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <div key={item.label} className="mega-menu-wrapper relative">
                  <button
                    className={`text-[15px] font-medium transition-colors px-3 py-2 hover:bg-neutral-light rounded-md ${
                      isActive(item.href)
                        ? 'text-primary-500'
                        : 'text-neutral-nearBlack hover:text-primary-500'
                    }`}
                    onClick={() => item.megaMenu ? setOpenMegaMenu(openMegaMenu === item.label ? null : item.label) : null}
                    onMouseEnter={() => item.megaMenu ? setOpenMegaMenu(item.label) : null}
                  >
                    <Link to={item.href} className="flex items-center gap-1">
                      {item.label}
                      {item.megaMenu && (
                        <motion.svg
                          animate={{ rotate: openMegaMenu === item.label ? 180 : 0 }}
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </motion.svg>
                      )}
                    </Link>
                  </button>
                  
                  {/* Mega Menu Dropdown with Animation */}
                  <AnimatePresence>
                    {item.megaMenu && openMegaMenu === item.label && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-2 min-w-[200px] z-50"
                        onMouseLeave={() => setOpenMegaMenu(null)}
                      >
                        {item.subItems?.map((subItem) => (
                          <Link
                            key={subItem.label}
                            to={subItem.href}
                            className="block px-4 py-2 text-sm text-neutral-nearBlack hover:bg-neutral-light hover:text-primary-500 transition-colors"
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            {/* Desktop Actions - Right aligned icons */}
            <div className="hidden lg:flex items-center gap-6">
              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(true)}
                data-search-trigger
                className="relative text-neutral-nearBlack hover:text-primary-500 transition-colors p-2 hover:bg-neutral-light rounded-full"
                aria-label="Search products"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Wishlist */}
              <Link
                to={ROUTES.WISHLIST}
                className="relative text-neutral-nearBlack hover:text-primary-500 transition-colors p-2 hover:bg-neutral-light rounded-full"
                aria-label={`Wishlist with ${wishlistCount} items`}
              >
                <svg className="w-6 h-6" fill={wishlistCount > 0 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to={ROUTES.CART}
                className="relative text-neutral-nearBlack hover:text-primary-500 transition-colors p-2 hover:bg-neutral-light rounded-full"
                aria-label={`Shopping cart with ${itemCount} items`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* User Account / Authentication */}
              {isAuthenticated ? (
                <div className="relative mega-menu-wrapper">
                  <button
                    onClick={() => setOpenMegaMenu(openMegaMenu === 'user' ? null : 'user')}
                    className="flex items-center gap-2 text-neutral-nearBlack hover:text-primary-500 transition-colors p-2 hover:bg-neutral-light rounded-full"
                    aria-label="User menu"
                  >
                    {/* User Avatar */}
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                      {user?.firstName ? (
                        <span className="text-sm font-semibold text-primary-600">
                          {user.firstName.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* User Dropdown Menu */}
                  <AnimatePresence>
                    {openMegaMenu === 'user' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-2 min-w-[180px] z-50"
                      >
                        <Link
                          to={ROUTES.PROFILE}
                          className="block px-4 py-2 text-sm text-neutral-nearBlack hover:bg-neutral-light hover:text-primary-500 transition-colors"
                        >
                          My Profile
                        </Link>
                        <Link
                          to={ROUTES.ORDERS}
                          className="block px-4 py-2 text-sm text-neutral-nearBlack hover:bg-neutral-light hover:text-primary-500 transition-colors"
                        >
                          My Orders
                        </Link>
                        <button
                          onClick={logout}
                          className="block w-full text-left px-4 py-2 text-sm text-neutral-nearBlack hover:bg-neutral-light hover:text-red-600 transition-colors"
                        >
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to={ROUTES.LOGIN}
                    className="text-sm font-medium text-neutral-nearBlack hover:text-primary-500 transition-colors px-3 py-2 hover:bg-neutral-light rounded-md"
                  >
                    Sign in
                  </Link>
                </div>
              )}

              {/* Currency Selector - INR only */}
              <div className="flex items-center gap-1 text-sm font-medium text-neutral-nearBlack px-2 py-2" aria-label="Currency">
                <span>INR ₹</span>
              </div>

              {/* Language Selector */}
              <div className="relative mega-menu-wrapper">
                <button
                  onClick={() => setOpenMegaMenu(openMegaMenu === 'language' ? null : 'language')}
                  className="flex items-center gap-1 text-sm font-medium text-neutral-nearBlack hover:text-primary-500 transition-colors p-2 hover:bg-neutral-light rounded-md"
                  aria-label="Select language"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span>EN</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Language Dropdown */}
                <AnimatePresence>
                  {openMegaMenu === 'language' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-2 min-w-[120px] z-50"
                    >
                      <button className="block w-full text-left px-4 py-2 text-sm text-neutral-nearBlack hover:bg-neutral-light hover:text-primary-500 transition-colors">
                        English
                      </button>
                      <button className="block w-full text-left px-4 py-2 text-sm text-neutral-nearBlack hover:bg-neutral-light hover:text-primary-500 transition-colors">
                        Hindi
                      </button>
                      <button className="block w-full text-left px-4 py-2 text-sm text-neutral-nearBlack hover:bg-neutral-light hover:text-primary-500 transition-colors">
                        Gujarati
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile Menu Button with animated hamburger */}
            <button
              className="lg:hidden p-2 text-neutral-nearBlack hover:text-primary-500 transition-colors hover:bg-neutral-light rounded-full"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              <AnimatedHamburger isOpen={isMobileMenuOpen} />
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer - Slide-out */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-[64px] md:top-topbar left-0 h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] w-full bg-white shadow-xl z-40"
            >
              <div className="h-full overflow-y-auto">
                <div className="container-page py-6">
                  {/* Search in mobile drawer */}
                  <div className="mb-6">
                    <button
                      onClick={() => {
                        setIsSearchOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-neutral-light text-neutral-nearBlack rounded-lg hover:bg-neutral-200 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="text-nav-link text-gray-600">Search products...</span>
                    </button>
                  </div>

                  {/* Navigation with accordion */}
                  <nav className="space-y-1">
                    {NAV_ITEMS.map((item) => (
                      <div key={item.label} className="border-b border-neutral-light">
                        <div className="flex items-center justify-between">
                          <Link
                            to={item.href}
                            onClick={closeMobileMenu}
                            className={`flex-1 py-3 text-nav-link font-medium ${
                              isActive(item.href)
                                ? 'text-primary-500'
                                : 'text-neutral-nearBlack hover:text-primary-500'
                            }`}
                          >
                            {item.label}
                          </Link>
                          {item.megaMenu && (
                            <button
                              onClick={() => setOpenMobileSubmenu(openMobileSubmenu === item.label ? null : item.label)}
                              className="p-2 text-neutral-nearBlack hover:text-primary-500"
                              aria-label={`Toggle ${item.label} submenu`}
                            >
                              <motion.svg
                                animate={{ rotate: openMobileSubmenu === item.label ? 180 : 0 }}
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </motion.svg>
                            </button>
                          )}
                        </div>
                        
                        {/* Mobile Submenu Accordion */}
                        <AnimatePresence>
                          {item.megaMenu && openMobileSubmenu === item.label && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pl-4 pb-3 space-y-1">
                                {item.subItems?.map((subItem) => (
                                  <Link
                                    key={subItem.label}
                                    to={subItem.href}
                                    onClick={closeMobileMenu}
                                    className="block py-2 text-body text-neutral-nearBlack hover:text-primary-500 transition-colors"
                                  >
                                    {subItem.label}
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </nav>

                  {/* Actions in mobile drawer */}
                  <div className="mt-6 space-y-4">
                    {/* Wishlist */}
                    <Link
                      to={ROUTES.WISHLIST}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 p-3 text-nav-link text-neutral-nearBlack hover:bg-neutral-light rounded-lg transition-colors"
                    >
                      <svg className="w-6 h-6" fill={wishlistCount > 0 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>Wishlist</span>
                      {wishlistCount > 0 && (
                        <span className="ml-auto bg-primary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {wishlistCount}
                        </span>
                      )}
                    </Link>

                    {/* Cart */}
                    <Link
                      to={ROUTES.CART}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 p-3 text-nav-link text-neutral-nearBlack hover:bg-neutral-light rounded-lg transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                      </svg>
                      <span>Cart</span>
                      {itemCount > 0 && (
                        <span className="ml-auto bg-primary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {itemCount}
                        </span>
                      )}
                    </Link>

                    {/* Account Links */}
                    {isAuthenticated ? (
                      <div className="space-y-2 pt-4 border-t border-neutral-light">
                        <Link
                          to={ROUTES.PROFILE}
                          onClick={closeMobileMenu}
                          className="block py-3 text-nav-link text-neutral-nearBlack hover:text-primary-500"
                        >
                          My Profile
                        </Link>
                        <Link
                          to={ROUTES.ORDERS}
                          onClick={closeMobileMenu}
                          className="block py-3 text-nav-link text-neutral-nearBlack hover:text-primary-500"
                        >
                          My Orders
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            closeMobileMenu();
                          }}
                          className="block w-full text-left py-3 text-nav-link text-neutral-nearBlack hover:text-red-600"
                        >
                          Logout
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-4 border-t border-neutral-light">
                        <Link
                          to={ROUTES.LOGIN}
                          onClick={closeMobileMenu}
                          className="block w-full py-3 bg-primary-500 text-white text-nav-link text-center rounded-lg hover:bg-primary-500/90 transition-colors"
                        >
                          Sign in
                        </Link>
                        <Link
                          to={ROUTES.REGISTER}
                          onClick={closeMobileMenu}
                          className="block w-full py-3 border border-primary-500 text-primary-500 text-nav-link text-center rounded-lg hover:bg-primary-500 hover:text-white transition-colors"
                        >
                          Sign up
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Search Modal */}
      <ProductSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
};

export default Header;
