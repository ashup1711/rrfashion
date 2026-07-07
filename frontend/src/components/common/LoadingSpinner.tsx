interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const LoadingSpinner = ({ size = 'md', className = '', label }: LoadingSpinnerProps) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`} role="status">
      <svg
        className={`animate-spin text-primary-600 ${sizeClasses[size]}`}
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {label && <span className="mt-2 text-sm text-gray-500">{label}</span>}
    </div>
  );
};

export default LoadingSpinner;
