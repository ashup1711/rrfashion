import { motion } from 'framer-motion';

interface TrustItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const TruckIcon = () => (
  <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const ReturnsIcon = () => (
  <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const SupportIcon = () => (
  <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
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
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
};

const TrustBar = () => {
  return (
    <section className="border-y border-neutral-medium/20" aria-label="Trust and service guarantees">
      <div className="container-page py-10 md:py-12">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {trustItems.map((item) => (
            <motion.div
              key={item.id}
              variants={itemVariants}
              className="flex flex-col items-center text-center space-y-3 group"
            >
              <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center transition-all duration-300 group-hover:bg-primary-100 group-hover:scale-110">
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
