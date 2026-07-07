export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const ROUTES = {
  // Customer routes
  HOME: '/',
  SHOP: '/shop',
  SHOP_CATEGORY: (slug: string) => `/shop?category=${slug}`,
  PRODUCT_DETAIL: (id: string) => `/products/${id}`,
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDERS: '/orders',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  PROFILE: '/profile',
  SALE: '/sale',
  ORDER_DETAIL: (id: string) => `/orders/${id}`,
  GUEST_CHECKOUT: '/checkout/guest',
  WISHLIST: '/wishlist',
  CONTACT: '/contact',
  FAQ: '/faq',
  SHIPPING_RETURNS: '/shipping-returns',

  // Admin routes
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_PRODUCTS: '/admin/products',
  ADMIN_PRODUCT_NEW: '/admin/products/new',
  ADMIN_PRODUCT_EDIT: (id: string) => `/admin/products/${id}/edit`,
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_BRANDS: '/admin/brands',
  ADMIN_ROLES: '/admin/roles',
  ADMIN_USERS: '/admin/users',
  ADMIN_STORES: '/admin/stores',
  ADMIN_INVENTORY: '/admin/inventory',
  ADMIN_REVIEWS: '/admin/reviews',
  ADMIN_RENTALS: '/admin/rentals',
  ADMIN_INVOICES: '/admin/invoices',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_WALLET: '/admin/wallet',
  ADMIN_COUPONS: '/admin/coupons',
  ADMIN_INQUIRIES: '/admin/inquiries',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_ORDER_DETAIL: (id: string) => `/admin/orders/${id}`,
} as const;

export const QUERY_KEYS = {
  // Products
  products: 'products',
  product: 'product',
  productVariants: 'productVariants',

  // Categories
  categories: 'categories',
  category: 'category',
  categoryTree: 'categoryTree',

  // Orders
  orders: 'orders',
  order: 'order',

  // Cart
  cart: 'cart',

  // Reviews
  reviews: 'reviews',

  // Auth / User
  user: 'user',
  me: 'me',

  // Admin
  adminMe: 'adminMe',
  adminUsers: 'adminUsers',
  adminUser: 'adminUser',
  roles: 'roles',
  role: 'role',
  permissions: 'permissions',
  brands: 'brands',
  brand: 'brand',
  stores: 'stores',
  store: 'store',
  inventory: 'inventory',
  inventoryVariant: 'inventoryVariant',

  // Reviews Admin
  adminReviews: 'adminReviews',

  // Rentals
  rentals: 'rentals',
  rental: 'rental',

  // Invoices
  invoices: 'invoices',
  invoice: 'invoice',

  // Analytics
  analyticsDashboard: 'analyticsDashboard',
  analyticsRevenue: 'analyticsRevenue',
  analyticsTopProducts: 'analyticsTopProducts',

  // Wallet
  walletBalance: 'walletBalance',
  walletTransactions: 'walletTransactions',
  adminWalletStats: 'adminWalletStats',
  adminWalletTransactions: 'adminWalletTransactions',

  // Coupons
  coupons: 'coupons',
  coupon: 'coupon',

  // Inquiries
  inquiries: 'inquiries',
  inquiry: 'inquiry',

  // Reports
  reports: 'reports',
  report: 'report',

  // Addresses
  addresses: 'addresses',

  // Admin Orders
  adminOrders: 'adminOrders',
  adminOrder: 'adminOrder',
  orderStatusLogs: 'orderStatusLogs',

  // POS Conflicts
  posConflicts: 'posConflicts',

  // Wishlist
  wishlist: 'wishlist',
  saleProducts: 'saleProducts',
  myOrders: 'myOrders',
  myOrder: 'myOrder',
  orderTracking: 'orderTracking',
  profile: 'profile',
  guestAuth: 'guestAuth',
} as const;

export const CATEGORY_SLUGS = {
  KURTI: 'womens-kurtis',
  LONG_KURTI: 'womens-long-kurti',
  SHORT_KURTI: 'womens-short-kurti',
  GOWN: 'womens-gown',
  SAREE: 'womens-sarees',
  JEWELLERY: 'jewellery',
} as const;

export const STALE_TIMES = {
  products: 1000 * 60 * 5,
  categories: 1000 * 60 * 30,
  orders: 1000 * 60 * 2,
  cart: 1000 * 60,
  brands: 1000 * 60 * 30,
  stores: 1000 * 60 * 30,
  roles: 1000 * 60 * 5,
  permissions: 1000 * 60 * 30,
  adminUsers: 1000 * 60 * 5,
  inventory: 1000 * 60 * 2,
} as const;
