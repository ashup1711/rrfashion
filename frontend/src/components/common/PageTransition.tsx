import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useRef, useEffect, useState, type ReactNode } from 'react';
import type { Variants } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    },
  },
};

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false);
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, isFirstRender]);

  // initial=false on first render to prevent flash, then animate on subsequent navigations
  const isInitial = isFirstRender;

  return (
    <AnimatePresence mode="wait" initial={isInitial}>
      <motion.div
        key={location.pathname + (isFirstRender ? '-initial' : '')}
        variants={pageVariants}
        initial={isInitial ? false : 'initial'}
        animate="enter"
        exit="exit"
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
