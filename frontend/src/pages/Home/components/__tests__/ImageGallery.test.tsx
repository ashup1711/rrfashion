import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ImageGallery from '../ImageGallery';

const renderGallery = () => render(<MemoryRouter><ImageGallery /></MemoryRouter>);

describe('ImageGallery', () => {
  it('renders section title and subtitle', () => {
    renderGallery();
    expect(screen.getByText('Shop by Category')).toBeInTheDocument();
    expect(screen.getByText(/Discover our curated edits/i)).toBeInTheDocument();
  });

  it('renders all 6 shoppable category tiles', () => {
    renderGallery();
    const tileLinks = screen.getAllByRole('link');
    const galleryLinks = tileLinks.filter((link) =>
      link.getAttribute('aria-label')?.includes('-'),
    );
    expect(galleryLinks.length).toBeGreaterThanOrEqual(6);
  });

  it('renders tile titles', () => {
    renderGallery();
    expect(screen.getByText('Festive Promotions')).toBeInTheDocument();
    expect(screen.getByText('Accessories')).toBeInTheDocument();
    expect(screen.getByText('New In')).toBeInTheDocument();
    expect(screen.getByText('Kurtis')).toBeInTheDocument();
    expect(screen.getByText('Sarees')).toBeInTheDocument();
    expect(screen.getByText('Wedding Edit')).toBeInTheDocument();
  });

  it('links tiles to the right shop routes', () => {
    renderGallery();
    const saleLink = screen.getByRole('link', { name: /Festive Promotions/i });
    expect(saleLink.getAttribute('href')).toBe('/sale');
  });
});
