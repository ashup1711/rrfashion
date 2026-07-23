import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FreeShippingBar from '../FreeShippingBar';
import { FREE_SHIPPING_THRESHOLD } from '../../../utils/constants';

describe('FreeShippingBar', () => {
  it('renders progress message when below threshold', () => {
    render(<FreeShippingBar total={500} />);
    expect(screen.getByText(/Add .* for FREE shipping/i)).toBeInTheDocument();
  });

  it('renders earned-free-shipping message at threshold', () => {
    render(<FreeShippingBar total={FREE_SHIPPING_THRESHOLD} />);
    expect(screen.getByText(/You have earned FREE shipping/i)).toBeInTheDocument();
  });

  it('renders earned-free-shipping message above threshold', () => {
    render(<FreeShippingBar total={FREE_SHIPPING_THRESHOLD + 500} />);
    expect(screen.getByText(/You have earned FREE shipping/i)).toBeInTheDocument();
  });

  it('renders formatted INR remaining amount', () => {
    render(<FreeShippingBar total={0} />);
    expect(screen.getByText(/₹/)).toBeInTheDocument();
  });

  it('uses a custom threshold when provided', () => {
    render(<FreeShippingBar total={500} threshold={1000} />);
    expect(screen.getByText(/Add .* for FREE shipping/i)).toBeInTheDocument();
  });

  it('progressbar has correct aria values when below threshold', () => {
    render(<FreeShippingBar total={FREE_SHIPPING_THRESHOLD / 2} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('progressbar shows 100% at threshold', () => {
    render(<FreeShippingBar total={FREE_SHIPPING_THRESHOLD} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });
});
