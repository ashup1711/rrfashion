import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setStatus('idle');
    setStatusMessage('');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setStatus('success');
    setStatusMessage('Thank you for subscribing!');
    toast.success('Thank you for subscribing!');
    setEmail('');
    setIsSubmitting(false);
  };

  const statusId = 'newsletter-status';

  return (
    <section className="relative w-full page-section-alt overflow-hidden" aria-label="Newsletter signup">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=2000"
          alt="Newsletter background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary-900/40 backdrop-blur-[2px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10 text-center">
        <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md p-8 md:p-12 rounded-2xl border border-white/20 shadow-xl">
          {/* 10% OFF Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-5 py-2 bg-error text-white text-sm font-bold rounded-full mb-6 shadow-lg"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
            </svg>
            10% OFF Your First Order
          </motion.div>

          <h2 className="text-white font-display text-section-title md:text-4xl mb-4">
            Join Our Newsletter
          </h2>
          <p className="text-primary-100 text-section-subtitle mb-8">
            Subscribe to receive updates, access to exclusive deals, and style inspiration straight to your inbox.
          </p>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto"
            aria-describedby={status !== 'idle' ? statusId : undefined}
          >
            <div className="relative flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                aria-label="Email address"
                className="w-full px-6 py-4 rounded-full bg-white/95 text-neutral-nearBlack placeholder:text-neutral-dark/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:shadow-lg transition-all shadow-md"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 rounded-full bg-primary-500 text-white font-bold uppercase tracking-wider hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 flex-shrink-0"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Subscribing...
                </span>
              ) : 'Subscribe'}
            </button>
          </form>

          {/* Success Animation */}
          <AnimatePresence>
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                id={statusId}
                role="status"
                aria-live="polite"
                className="mt-6 flex items-center justify-center gap-2 text-primary-100"
              >
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="w-6 h-6 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </motion.svg>
                <span className="font-medium">{statusMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {status === 'error' && (
            <p
              id={statusId}
              role="alert"
              aria-live="polite"
              className="mt-4 text-caption text-red-200"
            >
              {statusMessage}
            </p>
          )}

          <p className="mt-4 text-primary-200 text-caption opacity-80">
            By subscribing you agree to our{' '}
            <a href="/faq" className="underline hover:text-white transition-colors">Terms of Use</a> and{' '}
            <a href="/faq" className="underline hover:text-white transition-colors">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
