import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/ui/Button';
import CheckoutForm from './components/CheckoutForm';
import OrderSummary from './components/OrderSummary';
import { useAuthStore } from '../../store/authStore';
import { useCart } from '../../hooks/useCart';

const STEPS = [
  { id: 'shipping', label: 'Shipping' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Review' },
];

const Checkout = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'redirecting'>('loading');
  const navigate = useNavigate();
  const hasTriggeredRedirect = useRef(false);

  const { isAuthenticated } = useAuthStore();
  const { items, isLoading: cartLoading, serverItems } = useCart();

  // Drive page state transitions based on cart loading status and items
  useEffect(() => {
    // Skip until the cart query has resolved (serverItems is defined)
    // This prevents premature redirect when the query hasn't returned yet
    // even if `isLoading` is already `false` (e.g. query disabled or cached).
    if (serverItems === undefined) return;

    const hasItems = items.length > 0 || serverItems.length > 0;
    if (hasItems) {
      // Cart has items — show checkout
      setPageState('ready');
    } else if (!hasTriggeredRedirect.current) {
      // Cart is empty — schedule a redirect AFTER rendering the loading UI
      // so the user never sees a blank flash
      hasTriggeredRedirect.current = true;
      setPageState('redirecting');
    }
  }, [serverItems, items]);

  // Perform the actual navigation in a separate effect so the loading spinner
  // renders in this cycle before the route changes
  useEffect(() => {
    if (pageState === 'redirecting') {
      // Brief delay so the loading spinner has time to paint
      const timer = setTimeout(() => {
        navigate('/cart', { replace: true });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pageState, navigate]);

  // Observability: log checkout page load status
  useEffect(() => {
    if (pageState !== 'loading') {
      console.log('[Checkout] Page load complete:', {
        status: pageState,
        itemCount: items.length,
        isAuthenticated,
        cartLoading,
      });
    }
  }, [pageState, items.length, isAuthenticated, cartLoading]);

  // Use a content variable pattern with a single ErrorBoundary wrapping all render paths
  let content;

  if (!isAuthenticated) {
    content = (
      <div className="bg-neutral-white min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-6">
              <svg
                className="w-16 h-16 mx-auto text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-display text-primary-900 uppercase tracking-widest mb-4">
              Please Login
            </h2>
            <p className="text-gray-600 mb-6">
              You need to be logged in to checkout. Sign in to your account for a faster checkout experience.
            </p>
            <div className="space-y-3">
              <Link to="/auth/login" className="block">
                <Button className="w-full">Login to Continue</Button>
              </Link>
              <p className="text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <Link to="/auth/register" className="text-primary-600 hover:text-primary-700 font-medium">
                  Sign up
                </Link>
              </p>
              <p className="text-sm text-gray-500">
                Or{' '}
                <Link to="/checkout/guest" className="text-primary-600 hover:text-primary-700 font-medium">
                  continue as guest
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (pageState === 'loading') {
    content = (
      <div className="bg-neutral-white min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading checkout..." />
      </div>
    );
  } else if (pageState === 'redirecting') {
    // Show a loading state while the redirect is scheduled (prevents blank flash)
    content = (
      <div className="bg-neutral-white min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" label="Your cart is empty — taking you back..." />
      </div>
    );
  } else if (pageState === 'ready') {
    content = (
      <div className="bg-neutral-white min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
              <h1 className="text-3xl font-display text-primary-900 uppercase tracking-widest">Checkout</h1>
              
              {/* Progress Indicator */}
              <div className="flex items-center gap-4 sm:gap-8">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                        index <= currentStep 
                          ? 'bg-primary-900 border-primary-900 text-white shadow-md' 
                          : 'bg-transparent border-neutral-medium text-neutral-dark'
                      }`}>
                        {index < currentStep ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${
                        index <= currentStep ? 'text-primary-900' : 'text-neutral-dark'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`w-8 sm:w-16 h-0.5 ml-4 sm:ml-8 -mt-6 transition-colors duration-300 ${
                        index < currentStep ? 'bg-primary-900' : 'bg-neutral-medium'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:grid lg:grid-cols-3 lg:gap-16">
              <div className="lg:col-span-2">
                <CheckoutForm onStepChange={setCurrentStep} currentStep={currentStep} />
              </div>
              <div className="mt-12 lg:mt-0">
                <div className="sticky top-24">
                  <OrderSummary />
                  
                  {/* Trust Badges */}
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-neutral-light rounded-xl border border-neutral-medium text-center">
                      <svg className="w-6 h-6 text-primary-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary-900">Secure Payment</p>
                    </div>
                    <div className="p-4 bg-neutral-light rounded-xl border border-neutral-medium text-center">
                      <svg className="w-6 h-6 text-primary-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                      </svg>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary-900">Easy Returns</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {content}
    </ErrorBoundary>
  );
};

export default Checkout;
