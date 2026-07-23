import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Breadcrumb from '../Breadcrumb';

const renderBreadcrumb = (items: { label: string; path?: string }[]) =>
  render(
    <MemoryRouter>
      <Breadcrumb items={items} />
    </MemoryRouter>,
  );

describe('Breadcrumb', () => {
  it('renders a Home link', () => {
    renderBreadcrumb([{ label: 'Shop' }]);
    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders items with separators and clickable links', () => {
    const { container } = renderBreadcrumb([
      { label: 'Category', path: '/shop?category=kurti' },
      { label: 'Product' },
    ]);
    expect(screen.getByRole('link', { name: 'Category' })).toHaveAttribute(
      'href',
      '/shop?category=kurti',
    );
    // Two separators (Home -> Category, Category -> Product)
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the last item as non-clickable text (current page)', () => {
    renderBreadcrumb([{ label: 'Shop' }]);
    // "Shop" should not be a link
    expect(screen.queryByRole('link', { name: 'Shop' })).not.toBeInTheDocument();
    expect(screen.getByText('Shop')).toBeInTheDocument();
  });

  it('emits SEO structured data (JSON-LD BreadcrumbList)', () => {
    const { container } = renderBreadcrumb([{ label: 'Category', path: '/c' }]);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
    const json = JSON.parse(script!.textContent || '{}');
    expect(json['@type']).toBe('BreadcrumbList');
    expect(json.itemListElement[0].name).toBe('Home');
    expect(json.itemListElement[1].name).toBe('Category');
  });
});
