import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WhatsAppButton from '../WhatsAppButton';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <WhatsAppButton />
    </MemoryRouter>,
  );

describe('WhatsAppButton', () => {
  it('renders on the home page with the correct WhatsApp link', () => {
    renderAt('/');
    const link = screen.getByRole('link', { name: /chat with us on whatsapp/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://wa.me/919725408903?text=Hi%20RR%20Fashion');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders on storefront pages like /shop and /wishlist', () => {
    renderAt('/shop');
    expect(screen.getByLabelText(/chat with us on whatsapp/i)).toBeInTheDocument();
  });

  it('does not render on /checkout', () => {
    renderAt('/checkout');
    expect(screen.queryByLabelText(/chat with us on whatsapp/i)).not.toBeInTheDocument();
  });

  it('does not render on /checkout sub-routes', () => {
    renderAt('/checkout/guest');
    expect(screen.queryByLabelText(/chat with us on whatsapp/i)).not.toBeInTheDocument();
  });

  it('does not render on /pos', () => {
    renderAt('/pos');
    expect(screen.queryByLabelText(/chat with us on whatsapp/i)).not.toBeInTheDocument();
  });

  it('does not render on /admin routes', () => {
    renderAt('/admin/products');
    expect(screen.queryByLabelText(/chat with us on whatsapp/i)).not.toBeInTheDocument();
  });
});
