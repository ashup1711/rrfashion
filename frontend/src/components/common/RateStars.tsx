interface RateStarsProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
}

const RateStars = ({ rating, reviewCount, size = 'sm' }: RateStarsProps) => {
  if (!rating || rating <= 0) return null;

  const starSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  const renderStars = () => {
    const filledStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => {
          const shouldBeFilled = index < filledStars;
          const shouldBeHalfStar = index === filledStars && hasHalfStar;

          return (
            <svg
              key={index}
              className={`${starSize} ${
                shouldBeFilled 
                  ? 'text-yellow-400' 
                  : shouldBeHalfStar 
                    ? 'text-gray-300'
                    : 'text-gray-300'
              }`}
              viewBox="0 0 20 20"
              fill={shouldBeFilled ? 'currentColor' : 'none'}
              stroke={shouldBeFilled ? 'currentColor' : '#D1D5DB'}
              strokeWidth={shouldBeFilled ? 0 : 1}
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
          );
        })}
        {hasHalfStar && (
          <svg
            className={`${starSize} text-yellow-400 absolute`}
            viewBox="0 0 20 20"
            style={{ position: 'absolute', opacity: 0 }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex" style={{ position: 'relative' }}>
        {renderStars()}
      </div>
      {reviewCount && (
        <span className="text-xs text-gray-500 font-medium">
          ({reviewCount})
        </span>
      )}
    </div>
  );
};

export default RateStars;