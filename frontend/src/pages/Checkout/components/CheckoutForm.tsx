import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { useAddresses } from '../../../hooks/useAddresses';
import { useCart } from '../../../hooks/useCart';
import { useCreateOrder } from '../../../hooks/useOrders';
import { verifyPayment } from '../../../api/payments';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, ROUTES } from '../../../utils/constants';
import { formatCurrency } from '../../../utils/formatCurrency';
import { loadRazorpayScript } from '../../../utils/loadRazorpay';
import { logger } from '../../../utils/logger';
import type { Order } from '../../../types/order';

interface AddressFormState {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
}

interface CheckoutFormProps {
  onStepChange: (step: number) => void;
  currentStep: number;
}

const CheckoutForm = ({ onStepChange, currentStep }: CheckoutFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: addresses, isLoading: addressesLoading, error: addressesError } = useAddresses();
  const { items: cartItems, total: cartTotal } = useCart();
  const createOrder = useCreateOrder();

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [formData, setFormData] = useState<AddressFormState>({
    firstName: '',
    lastName: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Initialize address selection when addresses data resolves
  useEffect(() => {
    if (addresses && addresses.length > 0) {
      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
      setFormData({
        firstName: '', // Backend Address model doesn't have first/last name
        lastName: '',
        line1: defaultAddr.line1,
        line2: defaultAddr.line2 || '',
        city: defaultAddr.city,
        state: defaultAddr.state,
        pincode: defaultAddr.pincode,
        phone: defaultAddr.phone || '',
      });
      setUseNewAddress(false);
    } else {
      // No saved addresses — user must enter a new address
      setUseNewAddress(true);
    }
  }, [addresses]);

  // If addresses API fails, fall back to new address mode
  useEffect(() => {
    if (addressesError) {
      setUseNewAddress(true);
      console.error('Failed to load saved addresses:', addressesError);
      toast.error('Unable to load saved addresses. You can enter a new address below.', {
        duration: 5000,
      });
    }
  }, [addressesError]);

  // -- Validation -----------------------------------------------------------
  const validate = useCallback((): boolean => {
    if (!useNewAddress && selectedAddressId) return true;

    const newErrors: FormErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.line1.trim()) newErrors.line1 = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-()]{10,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, useNewAddress, selectedAddressId]);

  // -- Handlers -------------------------------------------------------------
  const handleNextStep = () => {
    if (currentStep === 0) {
      if (validate()) {
        onStepChange(1);
        window.scrollTo(0, 0);
      }
    } else if (currentStep === 1) {
      onStepChange(2);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevStep = () => {
    onStepChange(Math.max(0, currentStep - 1));
    window.scrollTo(0, 0);
  };

  const handleAddressToggle = (id: string) => {
    if (id === 'new') {
      setUseNewAddress(true);
      setSelectedAddressId('');
    } else {
      setUseNewAddress(false);
      setSelectedAddressId(id);
      const addr = addresses?.find((a) => a.id === id);
      if (addr) {
        setFormData((prev) => ({
          ...prev,
          line1: addr.line1,
          line2: addr.line2 || '',
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          phone: addr.phone || '',
        }));
      }
    }
    setErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof FormErrors];
        return next;
      });
    }
  };

  // -- Submit ---------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (isProcessing) return;

    setIsProcessing(true);

    const shippingAddress = {
      name: useNewAddress 
        ? `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim()
        : addresses?.find(a => a.id === selectedAddressId)?.label || 'Saved Address',
      phone: formData.phone.trim(),
      line1: formData.line1.trim(),
      line2: formData.line2.trim() || undefined,
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
    };

    try {
      // Step 1: Create the order
      const order = await createOrder.mutateAsync({
        shippingAddress,
        paymentMethod,
        notes: '',
      });

      // Invalidate cart query
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });

      // If COD, we are done
      if (paymentMethod === 'cod') {
        toast.success('Order placed successfully!');
        navigate(ROUTES.ORDER_DETAIL(order.id));
        return;
      }

      // Step 2: Log order creation for debugging
      logger.debug('Order created:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        razorpayOrderId: order.razorpayOrderId,
        razorpayKeyId: order.razorpayKeyId ? `${order.razorpayKeyId.substring(0, 8)}...` : 'MISSING',
        amount: order.amount,
        razorpayError: order.razorpayError,
      });

      // Step 3: Check if Razorpay order creation failed server-side
      if (!order.razorpayOrderId) {
        // Check if there's a specific error from backend
        if (order.razorpayError) {
          logger.error('Razorpay initialization failed:', order.razorpayError);
        } else {
          logger.error('Razorpay order ID is missing from response');
        }
        setPaymentError(order.razorpayError || 'Failed to initialize payment gateway. Please try Cash on Delivery or contact support.');
        setCreatedOrder(order);
        setIsProcessing(false);
        return;
      }

      // Step 4: Validate Razorpay key before proceeding
      if (!order.razorpayKeyId) {
        console.error('[Payment] Razorpay key ID is missing from backend response');
        setPaymentError('Payment gateway is not configured properly. Please contact support or choose Cash on Delivery.');
        setCreatedOrder(order);
        setIsProcessing(false);
        return;
      }

      // Step 5: Load Razorpay checkout script
      try {
        logger.debug('Loading Razorpay checkout script...');
        await loadRazorpayScript();
        logger.debug('Razorpay script loaded successfully');
      } catch (scriptError) {
        console.error('[Payment] Failed to load Razorpay script:', scriptError);
        setPaymentError('Payment gateway failed to load. Your order is saved — you can try again.');
        setCreatedOrder(order);
        setIsProcessing(false);
        return;
      }

      // Step 6: Verify Razorpay is available
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        console.error('[Payment] Razorpay global object not found after script load');
        setPaymentError('Payment gateway failed to initialize. Please try again or contact support.');
        setCreatedOrder(order);
        setIsProcessing(false);
        return;
      }

      // Step 7: Log for debugging
      logger.debug('Opening Razorpay checkout:', {
        key: order.razorpayKeyId ? `${order.razorpayKeyId.substring(0, 8)}...` : 'MISSING',
        amount: order.amount,
        orderId: order.razorpayOrderId,
        orderNumber: order.orderNumber,
        currency: order.currency || 'INR',
      });

      // Step 8: Open Razorpay checkout modal with error handling
      const razorpayOptions = {
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'RR FASHION',
        description: `Order ${order.orderNumber}`,
        order_id: order.razorpayOrderId,
        handler: async (paymentResponse: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          logger.debug('Payment response received:', {
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
          });

          try {
            // Step 9: Verify payment on the backend
            logger.debug('Verifying payment with backend...');
            const verifyResult = await verifyPayment({
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
            });

            logger.debug('Verification result:', verifyResult);

            if (verifyResult.verified) {
              logger.debug('Payment verified successfully');
              toast.success('Payment successful! Your order is confirmed.');
              navigate(ROUTES.ORDER_DETAIL(order.id));
            } else {
              console.error('[Payment] Payment verification failed - not verified');
              toast.error(
                'Payment verification failed. Please contact support with your order number.',
              );
              navigate(ROUTES.ORDER_DETAIL(order.id));
            }
          } catch (verifyError) {
            console.error('[Payment] Payment verification failed:', verifyError);
            toast.error(
              'Payment verification failed. Your order is saved — please contact support.',
            );
            navigate(ROUTES.ORDER_DETAIL(order.id));
          }
        },
        prefill: {
          name: shippingAddress.name,
          contact: shippingAddress.phone,
        },
        theme: { color: '#2A2522' }, // Use primary-900 color
        modal: {
          ondismiss: () => {
            logger.debug('Payment modal dismissed by user');
            toast.error('Payment cancelled. Your order is saved and pending payment.');
            navigate(ROUTES.ORDER_DETAIL(order.id));
          },
        },
      };

      try {
        logger.debug('Initializing Razorpay instance...');
        const razorpay = new Razorpay(razorpayOptions);
        logger.debug('Opening Razorpay modal...');
        razorpay.open();
        logger.debug('Razorpay modal opened successfully');
      } catch (initError) {
        console.error('[Payment] Razorpay initialization failed:', initError);
        setPaymentError('Failed to open payment gateway. Please try Cash on Delivery or contact support.');
        setCreatedOrder(order);
        setIsProcessing(false);
        return;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      toast.error(message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Payment Error Recovery UI */}
      {paymentError && createdOrder && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-800 uppercase tracking-widest mb-2">Payment Failed</h3>
              <p className="text-sm text-red-700 leading-relaxed mb-4">{paymentError}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setPaymentError(null);
                    setCreatedOrder(null);
                    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                  }}
                  className="px-6 py-2.5 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate(ROUTES.ORDER_DETAIL(createdOrder.id))}
                  className="px-6 py-2.5 bg-white text-red-800 text-xs font-bold uppercase tracking-widest rounded-xl border border-red-200 hover:bg-red-50 transition-all"
                >
                  View Order
                </button>
                <Link
                  to={ROUTES.ORDERS}
                  className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-red-600 hover:text-red-800 transition-colors self-center"
                >
                  Choose Cash on Delivery →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Step 1: Shipping */}
      {currentStep === 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8">
            <h2 className="text-2xl font-display text-primary-900 uppercase tracking-widest mb-2">Shipping Information</h2>
            <p className="text-neutral-dark text-sm">Where should we send your order?</p>
          </div>

          {/* Saved Addresses Cards */}
          {addressesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 bg-neutral-light rounded-2xl animate-pulse border border-neutral-medium" />
              ))}
            </div>
          ) : addresses && addresses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {addresses.map((addr) => (
                <div 
                  key={addr.id}
                  onClick={() => handleAddressToggle(addr.id)}
                  className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative group ${
                    selectedAddressId === addr.id && !useNewAddress
                      ? 'border-primary-900 bg-white shadow-lg' 
                      : 'border-neutral-medium bg-neutral-light hover:border-primary-400'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <Badge
                      variant={
                        addr.label === 'Home'
                          ? 'info'
                          : addr.label === 'Work'
                            ? 'warning'
                            : 'default'
                      }
                      className="uppercase tracking-widest text-[10px] font-bold"
                    >
                      {addr.label}
                    </Badge>
                    {(selectedAddressId === addr.id && !useNewAddress) && (
                      <div className="w-6 h-6 bg-primary-900 rounded-full flex items-center justify-center text-white shadow-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-primary-900 font-medium leading-relaxed">
                    <p className="font-bold mb-1 uppercase tracking-tight">{addr.line1}</p>
                    {addr.line2 && <p className="opacity-70 mb-1">{addr.line2}</p>}
                    <p className="opacity-70">{addr.city}, {addr.state} - {addr.pincode}</p>
                    {addr.phone && <p className="mt-2 text-xs font-bold text-neutral-dark">T: {addr.phone}</p>}
                  </div>
                </div>
              ))}
              <div 
                onClick={() => handleAddressToggle('new')}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 group ${
                  useNewAddress
                    ? 'border-primary-900 bg-white shadow-lg' 
                    : 'border-neutral-medium bg-neutral-light hover:border-primary-400'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  useNewAddress ? 'bg-primary-900 text-white' : 'bg-neutral-medium text-neutral-dark group-hover:bg-primary-100 group-hover:text-primary-600'
                }`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-primary-900 uppercase tracking-widest">New Address</p>
              </div>
            </div>
          ) : null}

          {/* New Address Form */}
          {useNewAddress && (
            <div className="space-y-6 bg-neutral-light p-8 rounded-2xl border border-neutral-medium">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary-900 uppercase tracking-widest ml-1">First Name</label>
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.firstName ? 'border-error' : 'border-neutral-medium'
                    }`}
                  />
                  {errors.firstName && <p className="text-[10px] font-bold text-error uppercase ml-1">{errors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary-900 uppercase tracking-widest ml-1">Last Name</label>
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.lastName ? 'border-error' : 'border-neutral-medium'
                    }`}
                  />
                  {errors.lastName && <p className="text-[10px] font-bold text-error uppercase ml-1">{errors.lastName}</p>}
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-primary-900 uppercase tracking-widest ml-1">Street Address</label>
                  <input
                    name="line1"
                    value={formData.line1}
                    onChange={handleInputChange}
                    placeholder="Enter house number and street name"
                    className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.line1 ? 'border-error' : 'border-neutral-medium'
                    }`}
                  />
                  {errors.line1 && <p className="text-[10px] font-bold text-error uppercase ml-1">{errors.line1}</p>}
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-primary-900 uppercase tracking-widest ml-1">Apartment, suite, etc. (optional)</label>
                  <input
                    name="line2"
                    value={formData.line2}
                    onChange={handleInputChange}
                    placeholder="Apartment, suite, etc. (optional)"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary-900 uppercase tracking-widest ml-1">City</label>
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.city ? 'border-error' : 'border-neutral-medium'
                    }`}
                  />
                  {errors.city && <p className="text-[10px] font-bold text-error uppercase ml-1">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary-900 uppercase tracking-widest ml-1">State</label>
                  <input
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="State"
                    className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.state ? 'border-error' : 'border-neutral-medium'
                    }`}
                  />
                  {errors.state && <p className="text-[10px] font-bold text-error uppercase ml-1">{errors.state}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary-900 uppercase tracking-widest ml-1">ZIP Code</label>
                  <input
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    placeholder="ZIP Code"
                    className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.pincode ? 'border-error' : 'border-neutral-medium'
                    }`}
                  />
                  {errors.pincode && <p className="text-[10px] font-bold text-error uppercase ml-1">{errors.pincode}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary-900 uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Phone Number"
                    className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.phone ? 'border-error' : 'border-neutral-medium'
                    }`}
                  />
                  {errors.phone && <p className="text-[10px] font-bold text-error uppercase ml-1">{errors.phone}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 flex justify-end">
            <Button 
              size="lg" 
              className="px-12 py-4 rounded-xl uppercase tracking-widest font-bold text-sm shadow-md hover:shadow-lg transition-all"
              onClick={handleNextStep}
            >
              Continue to Payment
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Payment */}
      {currentStep === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8">
            <h2 className="text-2xl font-display text-primary-900 uppercase tracking-widest mb-2">Payment Method</h2>
            <p className="text-neutral-dark text-sm">How would you like to pay for your order?</p>
          </div>

          <div className="space-y-4 mb-12">
            <div 
              onClick={() => setPaymentMethod('razorpay')}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-6 ${
                paymentMethod === 'razorpay'
                  ? 'border-primary-900 bg-white shadow-lg' 
                  : 'border-neutral-medium bg-neutral-light hover:border-primary-400'
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                paymentMethod === 'razorpay' ? 'border-primary-900' : 'border-neutral-dark'
              }`}>
                {paymentMethod === 'razorpay' && <div className="w-3 h-3 bg-primary-900 rounded-full" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-primary-900 uppercase tracking-widest">Online Payment (Razorpay)</p>
                <p className="text-xs text-neutral-dark opacity-70 mt-1">UPI, Credit/Debit Card, Net Banking, or Wallet</p>
              </div>
              <div className="flex gap-2 opacity-50 grayscale group-hover:grayscale-0 transition-all">
                <img src="/images/payments/visa.svg" alt="Visa" className="h-4" />
                <img src="/images/payments/mastercard.svg" alt="Mastercard" className="h-4" />
                <img src="/images/payments/upi.svg" alt="UPI" className="h-3" />
              </div>
            </div>

            <div 
              onClick={() => setPaymentMethod('cod')}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-6 ${
                paymentMethod === 'cod'
                  ? 'border-primary-900 bg-white shadow-lg' 
                  : 'border-neutral-medium bg-neutral-light hover:border-primary-400'
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                paymentMethod === 'cod' ? 'border-primary-900' : 'border-neutral-dark'
              }`}>
                {paymentMethod === 'cod' && <div className="w-3 h-3 bg-primary-900 rounded-full" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-primary-900 uppercase tracking-widest">Cash on Delivery</p>
                <p className="text-xs text-neutral-dark opacity-70 mt-1">Pay when your order arrives at your doorstep</p>
              </div>
              <svg className="w-6 h-6 text-neutral-dark opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          <div className="flex justify-between">
            <Button 
              variant="outline"
              size="lg" 
              className="px-10 py-4 rounded-xl uppercase tracking-widest font-bold text-sm"
              onClick={handlePrevStep}
            >
              Back to Shipping
            </Button>
            <Button 
              size="lg" 
              className="px-12 py-4 rounded-xl uppercase tracking-widest font-bold text-sm shadow-md hover:shadow-lg transition-all"
              onClick={handleNextStep}
            >
              Review Order
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {currentStep === 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8">
            <h2 className="text-2xl font-display text-primary-900 uppercase tracking-widest mb-2">Review Your Order</h2>
            <p className="text-neutral-dark text-sm">Please verify your details before placing the order.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Shipping Review */}
            <div className="bg-neutral-light p-8 rounded-2xl border border-neutral-medium relative">
              <button 
                onClick={() => onStepChange(0)}
                className="absolute top-6 right-8 text-[10px] font-bold uppercase tracking-widest text-primary-600 hover:text-primary-900 transition-colors"
              >
                Change
              </button>
              <h4 className="text-xs font-bold text-primary-900 uppercase tracking-widest mb-4 opacity-50">Shipping to</h4>
              <div className="text-sm text-primary-900 font-medium leading-relaxed">
                <p className="font-bold text-base mb-2 uppercase tracking-tight">
                  {useNewAddress
                    ? `${formData.firstName} ${formData.lastName}`.trim()
                    : (addresses?.find(a => a.id === selectedAddressId)?.label || 'Saved Address')}
                </p>
                <p className="opacity-70 mb-1">{formData.line1}</p>
                {formData.line2 && <p className="opacity-70 mb-1">{formData.line2}</p>}
                <p className="opacity-70">{formData.city}, {formData.state} - {formData.pincode}</p>
                <p className="mt-4 text-xs font-bold text-neutral-dark uppercase tracking-widest">T: {formData.phone}</p>
              </div>
            </div>

            {/* Payment Review */}
            <div className="bg-neutral-light p-8 rounded-2xl border border-neutral-medium relative">
              <button 
                onClick={() => onStepChange(1)}
                className="absolute top-6 right-8 text-[10px] font-bold uppercase tracking-widest text-primary-600 hover:text-primary-900 transition-colors"
              >
                Change
              </button>
              <h4 className="text-xs font-bold text-primary-900 uppercase tracking-widest mb-4 opacity-50">Payment Method</h4>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-12 h-12 bg-white rounded-xl border border-neutral-medium flex items-center justify-center shadow-sm">
                  {paymentMethod === 'razorpay' ? (
                    <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-primary-900 uppercase tracking-widest">
                    {paymentMethod === 'razorpay' ? 'Online Payment' : 'Cash on Delivery'}
                  </p>
                  <p className="text-xs text-neutral-dark opacity-70 mt-1">
                    {paymentMethod === 'razorpay' ? 'Securely via Razorpay' : 'Pay on arrival'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary-50 p-6 rounded-2xl border border-primary-100 flex items-start gap-4 mb-12">
            <svg className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-primary-900 font-medium leading-relaxed">
              By clicking "Place Order", you agree to our <Link to="/terms" className="underline font-bold">Terms of Service</Link> and <Link to="/privacy" className="underline font-bold">Privacy Policy</Link>. You will be charged <span className="font-bold">{formatCurrency(cartTotal)}</span>.
            </p>
          </div>

          <div className="flex justify-between">
            <Button 
              variant="outline"
              size="lg" 
              className="px-10 py-4 rounded-xl uppercase tracking-widest font-bold text-sm"
              onClick={handlePrevStep}
              disabled={isProcessing}
            >
              Back to Payment
            </Button>
            <Button 
              size="lg" 
              className="px-16 py-4 rounded-xl uppercase tracking-widest font-bold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
              onClick={handleSubmit}
              isLoading={isProcessing || createOrder.isPending}
              disabled={isProcessing || createOrder.isPending || !cartItems.length}
            >
              Place Order
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutForm;
