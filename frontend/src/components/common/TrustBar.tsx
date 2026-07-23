import { motion } from 'framer-motion';

interface TrustItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const TruckIcon = () => (
  <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const ReturnsIcon = () => (
  <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const SupportIcon = () => (
  <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const CashOnDeliveryIcon = () => (
  <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const AuthenticIcon = () => (
  <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const trustItems: TrustItem[] = [
  {
    id: 'free-shipping',
    title: 'Free Shipping',
    subtitle: 'On all orders over ₹999',
    icon: <TruckIcon />,
  },
  {
    id: 'returns',
    title: '30-Day Returns',
    subtitle: 'Hassle-free returns',
    icon: <ReturnsIcon />,
  },
  {
    id: 'secure-payment',
    title: 'Secure Payment',
    subtitle: '100% protected payments',
    icon: <ShieldIcon />,
  },
  {
    id: 'support',
    title: '24/7 Support',
    subtitle: 'Hindi, English, Gujarati',
    icon: <SupportIcon />,
  },
  {
    id: 'cod',
    title: 'Cash on Delivery',
    subtitle: 'Pay when you receive',
    icon: <CashOnDeliveryIcon />,
  },
  {
    id: 'authentic',
    title: '100% Authentic',
    subtitle: 'Quality assured ethnic wear',
    icon: <AuthenticIcon />,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
} as const;

const TrustBar = () => {
  return (
    <section className="page-section-alt relative overflow-hidden" aria-label="Trust and service guarantees">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-white to-gray-50 opacity-50" />
      
      <div className="container-page py-12 md:py-14 relative">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {trustItems.map((item) => (
            <motion.div
              key={item.id}
              variants={itemVariants}
              className="flex flex-col items-center text-center space-y-2 group"
            >
              <div className="transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                {item.icon}
              </div>
              <h3 className="text-body font-semibold text-neutral-nearBlack group-hover:text-primary-500 transition-colors">
                {item.title}
              </h3>
              <p className="text-caption text-neutral-dark">
                {item.subtitle}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustBar;
