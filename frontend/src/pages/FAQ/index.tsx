const faqs = [
  { q: 'What is your return policy?', a: 'We accept returns within 15 days of delivery. Items must be unworn with tags attached.' },
  { q: 'How long does shipping take?', a: 'Standard shipping takes 5-7 business days. Express shipping takes 2-3 business days.' },
  { q: 'Do you offer international shipping?', a: 'Currently we ship only within India.' },
  { q: 'How do I track my order?', a: 'Once shipped, you will receive a tracking link via email and SMS.' },
  { q: 'Can I cancel my order?', a: 'Orders can be cancelled within 24 hours of placement before they are processed.' },
  { q: 'What payment methods do you accept?', a: 'We accept UPI, Credit/Debit Cards, Net Banking, and Cash on Delivery.' },
];

const FAQ = () => (
  <div className="container-page py-8 max-w-3xl mx-auto">
    <h1 className="text-3xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h1>
    <div className="space-y-4">
      {faqs.map((faq, i) => (
        <details key={i} className="bg-white border border-gray-200 rounded-lg p-4">
          <summary className="font-medium text-gray-900 cursor-pointer">{faq.q}</summary>
          <p className="mt-3 text-gray-600">{faq.a}</p>
        </details>
      ))}
    </div>
  </div>
);

export default FAQ;
