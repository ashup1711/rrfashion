import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: boolean;
}

const Card = ({ children, className = '', padding = true, ...props }: CardProps) => {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
