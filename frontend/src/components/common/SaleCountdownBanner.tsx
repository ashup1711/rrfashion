import DealTimer from './DealTimer';

const SALE_END_DATE = '2026-07-25T23:59:59+05:30';

const SaleCountdownBanner = () => {
  return (
    <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700">
      <div className="container-page py-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
        <p className="text-primary-100 text-caption uppercase tracking-[0.15em] font-medium">
          Diwali Mega Sale Ends In
        </p>
        <DealTimer endDate={SALE_END_DATE} variant="compact" />
      </div>
    </div>
  );
};

export default SaleCountdownBanner;
