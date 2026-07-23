import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PromoTile from '../PromoTile';
import type { PromoTileConfig } from '../PromoTile';

const config: PromoTileConfig = {
  title: 'Super Sale\nUp to 50%',
  subtitle: 'On select kurtis',
  cta: 'Shop Sale',
  link: '/sale',
  bgColor: 'bg-primary-500',
};

const renderTile = (cfg: PromoTileConfig = config) =>
  render(<MemoryRouter><PromoTile config={cfg} /></MemoryRouter>);

describe('PromoTile', () => {
  it('renders title (split across lines)', () => {
    renderTile();
    expect(screen.getByText('Super Sale')).toBeInTheDocument();
    expect(screen.getByText('Up to 50%')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    renderTile();
    expect(screen.getByText(/On select kurtis/i)).toBeInTheDocument();
  });

  it('renders CTA button', () => {
    renderTile();
    expect(screen.getByText('Shop Sale')).toBeInTheDocument();
  });

  it('links to the configured link', () => {
    renderTile();
    const link = screen.getByRole('link', { name: /Shop Sale/i });
    expect(link).toHaveAttribute('href', '/sale');
  });

  it('applies the configured background color class', () => {
    const { container } = renderTile();
    const link = container.querySelector('a');
    expect(link?.className).toContain('bg-primary-500');
  });

  it('handles single-line title', () => {
    renderTile({
      title: 'Just One Line',
      subtitle: 'Subtitle',
      cta: 'Click',
      link: '/shop',
      bgColor: 'bg-primary-500',
    });
    expect(screen.getByText('Just One Line')).toBeInTheDocument();
  });
});
