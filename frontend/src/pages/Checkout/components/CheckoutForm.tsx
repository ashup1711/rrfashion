import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useAddresses } from '../../../hooks/useAddresses';
import { useCart } from '../../../hooks/useCart';
import { useCreateOrder } from '../../../hooks/useOrders';
import { verifyPayment } from '../../../api/payments';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, ROUTES } from '../../../utils/constants';

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

/**
 * Dynamically load the Razorpay checkout.js script.
 * Returns a promise that resolves once the script is loaded.
 */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
    document.body.appendChild(script);
  });
}

const CheckoutForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: addresses, isLoading: addressesLoading } = useAddresses();
  const { items: cartItems } = useCart();
  const createOrder = useCreateOrder();

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [useNewAddress, setUseNewAddress] = useState(!addresses || addresses.length === 0);
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

  // -- Validation -----------------------------------------------------------
  const validate = useCallback((): boolean => {
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
  }, [formData]);

  // -- Handlers -------------------------------------------------------------
  const handleAddressSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedAddressId(id);
    if (id === 'new') {
      setUseNewAddress(true);
      setFormData({
        firstName: '',
        lastName: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
      });
    } else {
      setUseNewAddress(false);
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
    // Clear errors on address change
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
      name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
      phone: formData.phone.trim(),
      line1: formData.line1.trim(),
      line2: formData.line2.trim() || undefined,
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
    };

    try {
      // Step 1: Create the order (backends resolves items from cart, creates Razorpay order)
      const order = await createOrder.mutateAsync({
        shippingAddress,
        paymentMethod: 'razorpay',
        notes: '',
      });

      // Invalidate cart query so the cart page reflects the just-placed order
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });

      // Step 2: Handle case where Razorpay order creation failed server-side
      if (!order.razorpayOrderId) {
        toast.success(
          'Order placed successfully! Payment link will be sent to your registered contact.',
        );
        navigate(ROUTES.ORDER_DETAIL(order.id));
        return;
      }

      // Step 3: Load Razorpay checkout script if not already loaded
      try {
        await loadRazorpayScript();
      } catch {
        toast.error(
          'Payment gateway failed to load. Your order is saved — you can complete payment from your orders page.',
        );
        navigate(ROUTES.ORDER_DETAIL(order.id));
        return;
      }

      // Step 4: Open Razorpay checkout modal
      const Razorpay = (window as any).Razorpay;

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
          try {
            // Step 5: Verify payment on the backend
            const verifyResult = await verifyPayment({
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
            });

            if (verifyResult.verified) {
              toast.success('Payment successful! Your order is confirmed.');
              navigate(ROUTES.ORDER_DETAIL(order.id));
            } else {
              toast.error(
                'Payment verification failed. Please contact support with your order number.',
              );
              navigate(ROUTES.ORDER_DETAIL(order.id));
            }
          } catch {
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
        theme: { color: '#7C3AED' },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled. Your order is saved and pending payment.');
            navigate(ROUTES.ORDER_DETAIL(order.id));
          },
        },
      };

      const razorpay = new Razorpay(razorpayOptions);
      razorpay.open();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      toast.error(message);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Shipping Information */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Information</h3>

        {/* Saved Addresses Picker */}
        {addressesLoading ? (
          <LoadingSpinner size="sm" label="Loading addresses..." />
        ) : addresses && addresses.length > 0 ? (
          <div className="mb-4">
            <label htmlFor="saved-address" className="block text-sm font-medium text-gray-700 mb-1">
              Saved Addresses
            </label>
            <select
              id="saved-address"
              value={useNewAddress ? 'new' : selectedAddressId}
              onChange={handleAddressSelect}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label="Select a saved address"
            >
              {addresses.map((addr) => (
                <option key={addr.id} value={addr.id}>
                  {addr.label}: {addr.line1}, {addr.city}
                  {addr.isDefault ? ' (Default)' : ''}
                </option>
              ))}
              <option value="new">+ Enter a new address</option>
            </select>

            {/* Show selected address details */}
            {!useNewAddress && selectedAddressId && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                {(() => {
                  const addr = addresses?.find((a) => a.id === selectedAddressId);
                  if (!addr) return null;
                  return (
                    <div className="text-sm text-gray-700">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            addr.label === 'Home'
                              ? 'info'
                              : addr.label === 'Work'
                                ? 'warning'
                                : 'default'
                          }
                        >
                          {addr.label}
                        </Badge>
                        {addr.isDefault && <Badge variant="success">Default</Badge>}
                      </div>
                      <p>
                        {addr.line1}
                        {addr.line2 ? `, ${addr.line2}` : ''}
                      </p>
                      <p>
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      {addr.phone && <p>Phone: {addr.phone}</p>}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : null}

        {/* Address Form (shown when using new address or no saved addresses) */}
        {(useNewAddress || !addresses || addresses.length === 0) && (
          <div className="space-y-4">
            {(!addresses || addresses.length === 0) && (
              <p className="text-sm text-gray-500 italic">
                No saved addresses. Please enter your shipping details below.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                error={errors.firstName}
                placeholder="John"
              />
              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                error={errors.lastName}
                placeholder="Doe"
              />
              <div className="sm:col-span-2">
                <Input
                  label="Address"
                  name="line1"
                  value={formData.line1}
                  onChange={handleInputChange}
                  error={errors.line1}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Address Line 2 (Optional)"
                  name="line2"
                  value={formData.line2}
                  onChange={handleInputChange}
                  placeholder="Apartment, suite, etc."
                />
              </div>
              <Input
                label="City"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                error={errors.city}
                placeholder="Mumbai"
              />
              <Input
                label="State"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                error={errors.state}
                placeholder="Maharashtra"
              />
              <Input
                label="ZIP Code"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                error={errors.pincode}
                placeholder="400001"
              />
              <Input
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                error={errors.phone}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Payment Method */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
        <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
          <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-purple-800">Secure Payment via Razorpay</p>
            <p className="text-xs text-purple-600">
              Pay using UPI, Credit/Debit Card, Net Banking, or Wallet
            </p>
          </div>
        </div>
      </Card>

      {/* Order-level error display */}
      {createOrder.isError && (
        <div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"
          role="alert"
        >
          {createOrder.error instanceof Error
            ? createOrder.error.message
            : 'Failed to place order. Please check your details and try again.'}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full sm:w-auto"
        isLoading={isProcessing || createOrder.isPending}
        disabled={isProcessing || createOrder.isPending || !cartItems.length}
        aria-busy={isProcessing || createOrder.isPending}
      >
        {isProcessing ? 'Processing...' : 'Place Order'}
      </Button>

      {!cartItems.length && !createOrder.isPending && (
        <p className="mt-2 text-sm text-gray-500">
          Add items to your cart before placing an order.
        </p>
      )}
    </form>
  );
};

export default CheckoutForm;
