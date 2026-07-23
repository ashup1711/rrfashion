import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      setStatus('error');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 5000);
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const footerLinks = {
    about: {
      title: 'About',
      links: [
        { label: 'About Us', to: ROUTES.FAQ },
        { label: 'Our Story', to: ROUTES.FAQ },
        { label: 'Contact Us', to: ROUTES.CONTACT },
        { label: 'FAQ', to: ROUTES.FAQ },
      ]
    },
    customerServices: {
      title: 'Customer Services',
      links: [
        { label: 'Shipping & Returns', to: ROUTES.SHIPPING_RETURNS },
        { label: 'Privacy Policy', to: ROUTES.FAQ },
        { label: 'Terms of Service', to: ROUTES.FAQ },
        { label: 'Help & Support', to: ROUTES.CONTACT },
      ]
    },
    myAccount: {
      title: 'My Account',
      links: [
        { label: 'My Orders', to: ROUTES.ORDERS },
        { label: 'My Addresses', to: ROUTES.PROFILE },
        { label: 'My Wishlist', to: ROUTES.WISHLIST },
        { label: 'Track Order', to: ROUTES.ORDERS },
      ]
    },
  };

  return (
    <footer className="bg-neutral-nearBlack text-primary-100">
      <div className="container-page pt-16 pb-8 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 flex-1">
          {/* About Section */}
          <div className="border-b border-primary-800/30 md:border-none">
            <button 
              className="flex justify-between items-center w-full py-4 md:py-0 md:cursor-default"
              onClick={() => toggleSection('about')}
            >
              <h3 className="font-display text-section-subtitle text-neutral-white font-semibold">About</h3>
              <svg 
                className={`w-5 h-5 md:hidden transition-transform duration-300 ${openSections.about ? 'rotate-180' : ''}`} 
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={`${openSections.about ? 'max-h-96 pb-6' : 'max-h-0'} md:max-h-none overflow-hidden transition-all duration-300 md:block mt-6`}>
              <ul className="space-y-4">
                {footerLinks.about.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-body-small text-primary-300 hover:text-neutral-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Customer Services Section */}
          <div className="border-b border-primary-800/30 md:border-none">
            <button
              className="flex justify-between items-center w-full py-4 md:py-0 md:cursor-default"
              onClick={() => toggleSection('customerServices')}
            >
              <h3 className="font-display text-section-subtitle text-neutral-white font-semibold">Customer Services</h3>
              <svg
                className={`w-5 h-5 md:hidden transition-transform duration-300 ${openSections.customerServices ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={`${openSections.customerServices ? 'max-h-96 pb-6' : 'max-h-0'} md:max-h-none overflow-hidden transition-all duration-300 md:block mt-6`}>
              <ul className="space-y-4">
                {footerLinks.customerServices.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-body-small text-primary-300 hover:text-neutral-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* My Account Section */}
          <div className="border-b border-primary-800/30 md:border-none">
            <button
              className="flex justify-between items-center w-full py-4 md:py-0 md:cursor-default"
              onClick={() => toggleSection('myAccount')}
            >
              <h3 className="font-display text-section-subtitle text-neutral-white font-semibold">My Account</h3>
              <svg
                className={`w-5 h-5 md:hidden transition-transform duration-300 ${openSections.myAccount ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={`${openSections.myAccount ? 'max-h-96 pb-6' : 'max-h-0'} md:max-h-none overflow-hidden transition-all duration-300 md:block mt-6`}>
              <ul className="space-y-4">
                {footerLinks.myAccount.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-body-small text-primary-300 hover:text-neutral-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="mt-8 lg:mt-0">
            <h3 className="font-display text-section-subtitle text-neutral-white font-semibold mb-6">Newsletter</h3>
            <p className="text-body-small text-primary-300 mb-6 leading-relaxed">
              Subscribe for exclusive offers, new collection alerts, and Diwali/Navratri specials.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-3" noValidate>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full h-12 px-4 rounded-md bg-primary-900/50 border border-primary-800 text-neutral-white placeholder:text-primary-500 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-colors"
                  aria-label="Email address for newsletter subscription"
                  disabled={status === 'loading' || status === 'success'}
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="w-full h-12 bg-primary-100 text-neutral-nearBlack font-semibold rounded-md hover:bg-neutral-white transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? 'Subscribing...' : status === 'success' ? 'Subscribed!' : 'Subscribe'}
              </button>
            </form>
            
            {status === 'success' && (
              <p className="mt-3 text-success text-caption" role="status">
                Success! You're on the list.
              </p>
            )}
            
            {status === 'error' && (
              <p className="mt-3 text-error text-caption" role="alert">
                {errorMessage}
              </p>
            )}

            {/* Social Media Icons - More prominent */}
            <div className="flex items-center gap-5 mt-8">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-neutral-white transition-all hover:scale-110" aria-label="Facebook">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-neutral-white transition-all hover:scale-110" aria-label="Instagram">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-neutral-white transition-all hover:scale-110" aria-label="Twitter">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-neutral-white transition-all hover:scale-110" aria-label="Pinterest">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.966 1.406-5.966s-.359-.72-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.261 7.929-7.261 4.164 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-neutral-white transition-all hover:scale-110" aria-label="YouTube">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            </div>

            {/* Mobile App Download Badges (Placeholder) */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-900/50 border border-primary-800 rounded-lg hover:bg-primary-800/50 transition-colors cursor-pointer">
                <svg className="w-5 h-5 text-primary-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[8px] text-primary-400 uppercase">Download on the</p>
                  <p className="text-xs text-neutral-white font-semibold">App Store</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-900/50 border border-primary-800 rounded-lg hover:bg-primary-800/50 transition-colors cursor-pointer">
                <svg className="w-5 h-5 text-primary-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[8px] text-primary-400 uppercase">Get it on</p>
                  <p className="text-xs text-neutral-white font-semibold">Google Play</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-primary-800/30 my-10" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-6">
          <p className="text-caption text-primary-400 order-2 md:order-1">
            &copy; {currentYear} RR FASHION. All rights reserved.
          </p>
          
          {/* Payment Icons - All prominent */}
          <div className="flex items-center gap-3 order-1 md:order-2">
            <span className="w-10 h-7 bg-white rounded flex items-center justify-center px-1" title="Visa">
              <svg viewBox="0 0 48 16" className="h-3" fill="#1A1F71">
                <path d="M45.2 0H2.8C1.3 0 0 1.3 0 2.8v10.4C0 14.7 1.3 16 2.8 16h42.4c1.5 0 2.8-1.3 2.8-2.8V2.8C48 1.3 46.7 0 45.2 0z"/>
              </svg>
            </span>
            <span className="w-10 h-7 bg-white rounded flex items-center justify-center" title="Mastercard">
              <svg viewBox="0 0 24 16" className="h-3">
                <circle cx="8" cy="8" r="7" fill="#EB001B"/>
                <circle cx="16" cy="8" r="7" fill="#F79E1B"/>
              </svg>
            </span>
            <span className="w-10 h-7 bg-white rounded flex items-center justify-center text-[8px] font-bold text-gray-700" title="UPI">
              UPI
            </span>
            <span className="w-10 h-7 bg-white rounded flex items-center justify-center" title="Razorpay">
              <svg viewBox="0 0 32 12" className="h-2.5">
                <text x="0" y="10" fill="#3399FF" fontSize="8" fontWeight="bold">R</text>
              </svg>
            </span>
            <span className="w-10 h-7 bg-white rounded flex items-center justify-center text-[8px] font-bold text-gray-700" title="Google Pay">
              GPay
            </span>
            <span className="w-10 h-7 bg-white rounded flex items-center justify-center" title="Apple Pay">
              <svg viewBox="0 0 40 16" className="h-3">
                <text x="0" y="12" fill="black" fontSize="7" fontWeight="bold">Apple</text>
              </svg>
            </span>
            <span className="w-10 h-7 bg-white rounded flex items-center justify-center text-[8px] font-bold text-gray-700" title="Paytm">
              Paytm
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
