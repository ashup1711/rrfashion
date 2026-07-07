const ShippingReturns = () => (
  <div className="container-page py-8 max-w-3xl mx-auto">
    <h1 className="text-3xl font-bold text-gray-900 mb-8">Shipping & Returns Policy</h1>

    <section className="mb-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Policy</h2>
      <ul className="space-y-3 text-gray-600">
        <li><strong>Standard Shipping:</strong> ₹49 — Delivered in 5-7 business days</li>
        <li><strong>Express Shipping:</strong> ₹149 — Delivered in 2-3 business days</li>
        <li><strong>Free Shipping:</strong> On orders above ₹999</li>
        <li><strong>International Shipping:</strong> Not currently available</li>
      </ul>
    </section>

    <section className="mb-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Returns Policy</h2>
      <ul className="space-y-3 text-gray-600">
        <li>Returns accepted within <strong>15 days</strong> of delivery</li>
        <li>Items must be unworn, unwashed, with all tags attached</li>
        <li>Refunds processed within 7-10 business days after inspection</li>
        <li>Shipping charges for returns are borne by the customer</li>
      </ul>
    </section>
  </div>
);

export default ShippingReturns;
