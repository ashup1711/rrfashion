import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES, CATEGORY_SLUGS } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlist } from '../../hooks/useWishlist';

const NAV_ITEMS = [
  { label: 'Home', href: ROUTES.HOME },
  { label: 'Kurti', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.KURTI) },
  { label: 'Gown', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.GOWN) },
  { label: 'Saree', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.SAREE) },
  { label: 'Jewellery', href: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.JEWELLERY) },
];

const Header = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const itemCount = useCartStore((state) => state.itemCount);
  const { items: wishlistItems } = useWishlist();
  const wishlistCount = wishlistItems.length;
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === ROUTES.HOME) return location.pathname === '/';
    return location.search.includes(href.split('=')[1]);
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="bg-white h-topbar sticky top-0 z-50">
      <div className="container-page h-full">
        <div className="flex items-center justify-between h-full">
          <Link to={ROUTES.HOME} className="flex items-center gap-3">
            <div className="w-[80px] h-[80px] bg-mauve rounded-full flex items-center justify-center">
              <span className="text-white font-display font-bold text-lg">RR</span>
            </div>
            <span className="font-display font-bold text-2xl text-black">RR FASHION</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-10">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`text-nav-link transition-colors ${
                  isActive(item.href)
                    ? 'text-pink-rose font-medium'
                    : 'text-black font-normal hover:text-pink-rose'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              to={ROUTES.WISHLIST}
              className="relative text-gray-700 hover:text-pink-rose transition-colors"
              aria-label={`Wishlist with ${wishlistCount} items`}
            >
              <svg className="w-6 h-6" fill={wishlistCount > 0 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to={ROUTES.CART}
              className="relative text-gray-700 hover:text-pink-rose transition-colors"
              aria-label={`Shopping cart with ${itemCount} items`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-pink-rose text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to={ROUTES.PROFILE}
                  className="text-sm font-medium text-gray-700 hover:text-pink-rose transition-colors"
                >
                  {user?.firstName ?? 'Profile'}
                </Link>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to={ROUTES.LOGIN}
                  className="bg-mauve text-white text-button font-medium w-[92px] h-[46px] flex items-center justify-center rounded-[4px] hover:opacity-90 transition-opacity"
                >
                  Sign in
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  className="bg-mauve text-white text-button font-medium w-[99px] h-[46px] flex items-center justify-center rounded-[4px] hover:opacity-90 transition-opacity"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-gray-700 hover:text-pink-rose transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg">
          <nav className="container-page py-4">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    onClick={closeMobileMenu}
                    className={`block py-3 px-4 text-nav-link rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-mauve/10 text-pink-rose font-medium'
                        : 'text-black font-normal hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              <Link
                to={ROUTES.WISHLIST}
                onClick={closeMobileMenu}
                className="flex items-center gap-3 py-3 px-4 text-nav-link text-black hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill={wishlistCount > 0 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Wishlist
                {wishlistCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <Link
                to={ROUTES.CART}
                onClick={closeMobileMenu}
                className="flex items-center gap-3 py-3 px-4 text-nav-link text-black hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                Cart
                {itemCount > 0 && (
                  <span className="ml-auto bg-pink-rose text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <Link
                    to={ROUTES.PROFILE}
                    onClick={closeMobileMenu}
                    className="block py-3 px-4 text-nav-link text-black hover:bg-gray-100 rounded-lg"
                  >
                    {user?.firstName ?? 'Profile'}
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      closeMobileMenu();
                    }}
                    className="w-full text-left py-3 px-4 text-nav-link text-red-600 hover:bg-gray-100 rounded-lg"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link
                    to={ROUTES.LOGIN}
                    onClick={closeMobileMenu}
                    className="block py-3 px-4 bg-mauve text-white text-nav-link text-center rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Sign in
                  </Link>
                  <Link
                    to={ROUTES.REGISTER}
                    onClick={closeMobileMenu}
                    className="block py-3 px-4 bg-mauve text-white text-nav-link text-center rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
