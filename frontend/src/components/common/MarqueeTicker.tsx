const DEFAULT_ITEMS = [
  'Free shipping on orders over \u20B9999',
  'Easy 30-day returns',
  'Cash on Delivery available',
  'Use code FIRST10 for 10% off your first order',
];

interface MarqueeTickerProps {
  items?: string[];
}

const MarqueeTicker = ({ items = DEFAULT_ITEMS }: MarqueeTickerProps) => {
  if (!items.length) return null;

  return (
    <div className="bg-primary-900 text-primary-100 py-2 overflow-hidden" role="region" aria-label="Trust badges">
      <div className="animate-marquee whitespace-nowrap flex">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="text-caption font-medium mx-8">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarqueeTicker;
