import React, { useState, useEffect, useCallback } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface DealTimerProps {
  endDate: string | Date;
  onEnd?: () => void;
  variant?: 'compact' | 'full';
}

const DealTimer: React.FC<DealTimerProps> = ({ endDate, onEnd, variant = 'full' }) => {
  const calculateTimeLeft = useCallback((): TimeLeft | null => {
    const difference = +new Date(endDate) - +new Date();
    
    if (difference <= 0) {
      return null;
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }, [endDate]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (!remaining && onEnd) {
        onEnd();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft, onEnd]);

  if (!timeLeft) return null;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5 bg-error/90 backdrop-blur-sm text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-2 justify-center">
      {[
        { label: 'Days', value: timeLeft.days },
        { label: 'Hrs', value: timeLeft.hours },
        { label: 'Min', value: timeLeft.minutes },
        { label: 'Sec', value: timeLeft.seconds },
      ].map((item, idx) => (
        <div key={idx} className="flex flex-col items-center bg-white shadow-sm border border-primary-100 rounded-lg p-2 min-w-[50px]">
          <span className="text-lg font-bold text-primary-900 leading-none">
            {String(item.value).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-primary-400 uppercase font-medium mt-1">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default DealTimer;
