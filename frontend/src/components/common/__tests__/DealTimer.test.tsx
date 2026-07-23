import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DealTimer from '../DealTimer';

describe('DealTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders correctly with time remaining', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2); // 2 days in future
    
    render(<DealTimer endDate={futureDate} />);
    
    expect(screen.getByText(/02/)).toBeInTheDocument(); // Days
    expect(screen.getByText(/Days/i)).toBeInTheDocument();
  });

  it('renders compact version', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);
    
    render(<DealTimer endDate={futureDate} variant="compact" />);
    
    // Check for HH:MM:SS format (partially)
    expect(screen.getByText(/01:00:00/)).toBeInTheDocument();
  });

  it('calls onEnd when timer reaches zero', () => {
    const onEnd = vi.fn();
    const nearDate = new Date(Date.now() + 1000); // 1 second in future
    
    render(<DealTimer endDate={nearDate} onEnd={onEnd} />);
    
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    
    expect(onEnd).toHaveBeenCalled();
  });

  it('returns null if date is in the past', () => {
    const pastDate = new Date(Date.now() - 1000);
    const { container } = render(<DealTimer endDate={pastDate} />);
    expect(container.firstChild).toBeNull();
  });
});
