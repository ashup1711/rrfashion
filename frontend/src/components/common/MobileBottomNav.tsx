import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlist } from '../../hooks/useWishlist';
import { ROUTES } from '../../utils/constants';

interface NavItem {
  to: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  badge?: number;
  showWhen?: (isAuthed: boolean) => boolean;
}

const HomeIcon = (active: boolean) => (
  <svg
    className={`w-6 h-6 ${active ? 'text-primary-500' : 'text-neutral-dark'}`}
    fill={active ? 'currentColor' : 'none'}
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={active ? 0 : 1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const ShopIcon = (active: boolean) => (
  <svg
    className={`w-6 h-6 ${active ? 'text-primary-500' : 'text-neutral-dark'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
    />
  </svg>
);

const SearchIcon = (active: boolean) => (
  <svg
    className={`w-6 h-6 ${active ? 'text-primary-500' : 'text-neutral-dark'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const HeartIcon = (active: boolean) => (
  <svg
    className={`w-6 h-6 ${active ? 'text-primary-500' : 'text-neutral-dark'}`}
    fill={active ? 'currentColor' : 'none'}
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={active ? 0 : 1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

const CartIcon = (active: boolean) => (
  <svg
    className={`w-6 h-6 ${active ? 'text-primary-500' : 'text-neutral-dark'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
    />
  </svg>
);

const UserIcon = (active: boolean) => (
  <svg
    className={`w-6 h-6 ${active ? 'text-primary-500' : 'text-neutral-dark'}`}
    fill={active ? 'currentColor' : 'none'}
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={active ? 0 : 1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const MobileBottomNav = () => {
  const location = useLocation();
  const isAuthed = useAuthStore((state) => state.isAuthenticated);
  const cartCount = useCartStore((state) => state.itemCount);
  const { items: wishlistItems } = useWishlist();
  const wishlistCount = wishlistItems.length;

  const navItems: NavItem[] = [
    { to: ROUTES.HOME, label: 'Home', icon: HomeIcon },
    { to: ROUTES.SHOP, label: 'Shop', icon: ShopIcon },
    { to: '#search', label: 'Search', icon: SearchIcon },
    {
      to: ROUTES.WISHLIST,
      label: 'Wishlist',
      icon: HeartIcon,
      badge: wishlistCount,
      showWhen: () => true,
    },
    {
      to: ROUTES.CART,
      label: 'Cart',
      icon: CartIcon,
      badge: cartCount,
    },
  ];

  const accountItem: NavItem = {
    to: isAuthed ? ROUTES.PROFILE : ROUTES.LOGIN,
    label: 'Account',
    icon: UserIcon,
  };

  const items: NavItem[] = [...navItems, accountItem];

  const isActive = (to: string) => {
    if (to === '#search') return false;
    if (to === ROUTES.HOME) return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const handleClick = (e: React.MouseEvent, to: string) => {
    if (to === '#search') {
      e.preventDefault();
      const searchBtn = document.querySelector('[data-search-trigger]') as HTMLButtonElement;
      if (searchBtn) searchBtn.click();
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-medium shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-6 h-16 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={(e) => handleClick(e, item.to)}
              className={`flex flex-col items-center justify-center relative transition-colors ${
                active ? 'text-primary-500' : 'text-neutral-dark hover:text-primary-500'
              }`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* Active Indicator Pill */}
              {active && (
                <motion.span
                  layoutId="activeNavPill"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <div className="relative">
                {item.icon(active)}
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-primary-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow-sm"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 font-medium tracking-wide ${
                  active ? 'text-primary-500 font-semibold' : 'text-neutral-dark'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
