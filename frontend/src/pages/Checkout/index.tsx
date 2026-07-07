import ErrorBoundary from '../../components/common/ErrorBoundary';
import CheckoutForm from './components/CheckoutForm';
import OrderSummary from './components/OrderSummary';

const Checkout = () => {
  return (
    <ErrorBoundary>
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="lg:grid lg:grid-cols-3 lg:gap-12">
          <div className="lg:col-span-2">
            <CheckoutForm />
          </div>
          <div className="mt-8 lg:mt-0">
            <OrderSummary />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Checkout;
