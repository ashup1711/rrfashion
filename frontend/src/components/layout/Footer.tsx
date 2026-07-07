import { useState } from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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

    // Simulate API call (replace with actual API when available)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus('success');
      setEmail('');
      // Reset success message after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <footer className="bg-mauve text-off-white">
      <div className="container-page pt-12 pb-8 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 flex-1">
          <div>
            <h3 className="font-display text-footer-heading text-white mb-6">About</h3>
            <ul className="space-y-3">
              <li>
                <span className="text-footer-link text-off-white/70">
                  About Us
                  <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">Coming Soon</span>
                </span>
              </li>
              <li>
                <span className="text-footer-link text-off-white/70">
                  Our Story
                  <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">Coming Soon</span>
                </span>
              </li>
              <li>
                <span className="text-footer-link text-off-white/70">
                  Career
                  <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">Coming Soon</span>
                </span>
              </li>
              <li>
                <span className="text-footer-link text-off-white/70">
                  Our Team
                  <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">Coming Soon</span>
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-footer-heading text-white mb-6">Useful Links</h3>
            <ul className="space-y-3">
              <li>
                <span className="text-footer-link text-off-white/70">
                  Blog
                  <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">Coming Soon</span>
                </span>
              </li>
              <li>
                <span className="text-footer-link text-off-white/70">
                  FAQ
                  <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">Coming Soon</span>
                </span>
              </li>
              <li>
                <span className="text-footer-link text-off-white/70">
                  Privacy Policy
                  <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">Coming Soon</span>
                </span>
              </li>
              <li>
                <span className="text-footer-link text-off-white/70">
                  Terms &amp; Condition
                  <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">Coming Soon</span>
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-footer-heading text-white mb-6">Contact</h3>
            <ul className="space-y-3">
              <li className="text-footer-link text-off-white">123 Fashion Street,<br />Design District,<br />New York, NY 10001</li>
              <li><a href="tel:+11234567890" className="text-footer-link text-off-white hover:text-white transition-colors">+1 (123) 456-7890</a></li>
              <li><a href="mailto:info@rrfashion.com" className="text-footer-link text-off-white hover:text-white transition-colors">info@rrfashion.com</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-footer-heading text-white mb-6">Follow Us</h3>
            <ul className="space-y-3">
              <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-footer-link text-off-white hover:text-white transition-colors">Facebook</a></li>
              <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-footer-link text-off-white hover:text-white transition-colors">Instagram</a></li>
              <li><a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-footer-link text-off-white hover:text-white transition-colors">Youtube</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-footer-link text-off-white hover:text-white transition-colors">Linkedin</a></li>
            </ul>
          </div>
        </div>

        <hr className="border-divider my-6" />

        <div className="flex flex-col items-center gap-4 pb-4">
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-[651px]">
            <div className="relative w-full sm:flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Your Email Address"
                className="w-full h-[60px] sm:h-[78px] px-6 rounded-[10px] bg-white text-near-black text-[18px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Email address for newsletter subscription"
                disabled={status === 'loading' || status === 'success'}
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="w-full sm:w-auto h-[60px] sm:h-[78px] px-8 bg-lightest-gray text-near-black text-button font-semibold rounded-[10px] hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Subscribing...' : status === 'success' ? 'Subscribed!' : 'Subscribe'}
            </button>
          </form>
          
          {status === 'success' && (
            <p className="text-green-200 text-body-small" role="status">
              Thank you for subscribing to our newsletter!
            </p>
          )}
          
          {status === 'error' && (
            <p className="text-red-200 text-body-small" role="alert">
              {errorMessage}
            </p>
          )}
          
          <p className="text-body-small text-off-white/70">
            &copy; {currentYear} RR FASHION. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
