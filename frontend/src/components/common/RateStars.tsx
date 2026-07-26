interface RateStarsProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  isDemo?: boolean;
}

const RateStars = ({ rating, reviewCount, size = 'sm', isDemo = false }: RateStarsProps) => {
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

          // For half-star, use a gradient approach or fallback to full
          if (shouldBeHalfStar) {
            return (
              <span key={index} className="relative inline-block">
                <svg
                  className={`${starSize} text-neutral-medium`}
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
                <svg
                  className={`${starSize} text-yellow-400 absolute inset-0`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                >
                  <path
                    fillRule="evenodd"
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
              </span>
            );
          }

          return (
            <svg
              key={index}
              className={`${starSize} ${
                shouldBeFilled 
                  ? 'text-yellow-400' 
                  : 'text-neutral-medium'
              }`}
              viewBox="0 0 20 20"
              fill={shouldBeFilled ? 'currentColor' : 'none'}
              stroke={shouldBeFilled ? 'currentColor' : 'currentColor'}
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
      </div>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex" style={{ position: 'relative' }}>
        {renderStars()}
      </div>
      {reviewCount && (
        <span className="text-xs text-neutral-dark font-medium">
          ({reviewCount})
        </span>
      )}
      {isDemo && (
        <span className="text-[9px] text-neutral-medium font-medium uppercase tracking-wider border border-neutral-medium rounded-sm px-1 py-0.5 ml-1">
          Demo
        </span>
      )}
    </div>
  );
};

export default RateStars;
