import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TrustBar from '../TrustBar';

describe('TrustBar', () => {
  it('renders all 6 trust items', () => {
    render(<TrustBar />);
    expect(screen.getByText('Free Shipping')).toBeInTheDocument();
    expect(screen.getByText('30-Day Returns')).toBeInTheDocument();
    expect(screen.getByText('Secure Payment')).toBeInTheDocument();
    expect(screen.getByText('24/7 Support')).toBeInTheDocument();
    expect(screen.getByText('Cash on Delivery')).toBeInTheDocument();
    expect(screen.getByText('100% Authentic')).toBeInTheDocument();
  });

  it('renders INR free-shipping copy', () => {
    render(<TrustBar />);
    expect(screen.getByText(/On all orders over ₹999/i)).toBeInTheDocument();
  });

  it('renders updated 30-Day Returns subtitle', () => {
    render(<TrustBar />);
    expect(screen.getByText(/Hassle-free returns/i)).toBeInTheDocument();
  });

  it('renders COD subtitle', () => {
    render(<TrustBar />);
    expect(screen.getByText(/Pay when you receive/i)).toBeInTheDocument();
  });

  it('renders Authentic subtitle', () => {
    render(<TrustBar />);
    expect(screen.getByText(/Quality assured ethnic wear/i)).toBeInTheDocument();
  });

  it('renders Support subtitle in Indian languages', () => {
    render(<TrustBar />);
    expect(screen.getByText(/Hindi, English, Gujarati/i)).toBeInTheDocument();
  });

  it('applies page-section-alt background token', () => {
    const { container } = render(<TrustBar />);
    const section = container.querySelector('section');
    expect(section?.classList.contains('page-section-alt')).toBe(true);
  });
});
