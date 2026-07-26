import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ROUTES } from '../../utils/constants';

const LANGUAGES = ['EN', 'HI', 'GU'];

const TopBar = () => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('EN');

  const handleLangSelect = (lang: string) => {
    setSelectedLang(lang);
    setIsLangOpen(false);
  };

  return (
    <div className="hidden lg:block bg-neutral-nearBlack text-neutral-white/80 text-caption">
      <div className="container-page">
        <div className="flex items-center justify-between h-9">
          {/* Left side: Currency & Language */}
          <div className="flex items-center gap-0">
            <span className="px-3 py-1">INR ₹</span>

            <span className="text-neutral-white/20">|</span>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1 px-3 py-1 hover:text-neutral-white transition-colors"
                aria-label="Select language"
                aria-expanded={isLangOpen}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span>{selectedLang}</span>
                <motion.svg
                  animate={{ rotate: isLangOpen ? 180 : 0 }}
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              <AnimatePresence>
                {isLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-0.5 bg-white rounded-md shadow-lg border border-neutral-medium/30 py-1 min-w-[110px] z-50"
                  >
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => handleLangSelect(lang)}
                        className={`block w-full text-left px-4 py-1.5 text-sm transition-colors ${
                          selectedLang === lang
                            ? 'text-primary-500 font-medium'
                            : 'text-neutral-nearBlack hover:bg-neutral-light'
                        }`}
                      >
                        {lang === 'EN' ? 'English' : lang === 'HI' ? 'Hindi' : 'Gujarati'}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right side: Links */}
          <div className="flex items-center gap-0">
            <Link
              to={ROUTES.CONTACT}
              className="px-3 py-1 hover:text-neutral-white transition-colors"
            >
              Contact Us
            </Link>

            <span className="text-neutral-white/20">|</span>

            <Link
              to={ROUTES.ORDERS}
              className="px-3 py-1 hover:text-neutral-white transition-colors"
            >
              Track Order
            </Link>

            <span className="text-neutral-white/20">|</span>

            <Link
              to={ROUTES.FAQ}
              className="px-3 py-1 hover:text-neutral-white transition-colors"
            >
              Help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
