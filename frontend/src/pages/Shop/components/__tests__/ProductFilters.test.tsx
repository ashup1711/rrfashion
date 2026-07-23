import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/test-utils';
import ProductFilters from '../ProductFilters';
import type { ProductFilters as FilterType, ProductCountsResponse } from '../../../../types/product';

vi.mock('../../../../hooks/useCategories', () => ({
  useCategories: () => ({
    data: [
      { id: 'c1', name: 'Kurtis' },
      { id: 'c2', name: 'Sarees' },
    ],
  }),
}));

vi.mock('../../../../hooks/useBrands', () => ({
  useBrands: () => ({
    data: [
      { id: 'b1', name: 'Brand One' },
      { id: 'b2', name: 'Brand Two' },
    ],
  }),
}));

const renderFilters = (
  filters: FilterType = {},
  productCounts?: ProductCountsResponse,
) => {
  const onFilterChange = vi.fn();
  renderWithProviders(
    <ProductFilters
      filters={filters}
      onFilterChange={onFilterChange}
      productCounts={productCounts}
    />,
  );
  return { onFilterChange };
};

describe('ProductFilters - Sale & Availability filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a "Shop Sale Items Only" toggle as a switch', () => {
    renderFilters();
    const toggle = screen.getByRole('switch', { name: /shop sale items only/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onFilterChange with onSale true when the sale toggle is clicked', () => {
    const { onFilterChange } = renderFilters();
    const toggle = screen.getByRole('switch', { name: /shop sale items only/i });
    fireEvent.click(toggle);
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ onSale: true, page: 1 }),
    );
  });

  it('toggles the sale switch off when clicked again', () => {
    const { onFilterChange } = renderFilters({ onSale: true });
    const toggle = screen.getByRole('switch', { name: /shop sale items only/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ onSale: false, page: 1 }),
    );
  });

  it('renders In Stock and Out of Stock availability checkboxes', () => {
    renderFilters();
    const inStockLabel = screen.getByText('In Stock');
    const outOfStockLabel = screen.getByText('Out of Stock');
    expect(inStockLabel.closest('label')!.querySelector('input')).toBeInTheDocument();
    expect(outOfStockLabel.closest('label')!.querySelector('input')).toBeInTheDocument();
  });

  it('calls onFilterChange with inStock true when In Stock is checked', () => {
    const { onFilterChange } = renderFilters();
    const checkbox = screen
      .getByText('In Stock')
      .closest('label')!
      .querySelector('input') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ inStock: true, page: 1 }),
    );
  });

  it('shows product count badges next to categories when productCounts are provided', () => {
    renderFilters({}, {
      categories: { c1: 12, c2: 3 },
      brands: {},
      inStock: 0,
      outOfStock: 0,
    });
    // "Kurtis" category button + badge
    const kurtisBtn = screen.getByText('Kurtis').closest('button')!;
    expect(kurtisBtn).toHaveTextContent('Kurtis');
    expect(kurtisBtn).toHaveTextContent('(12)');
    const sareesBtn = screen.getByText('Sarees').closest('button')!;
    expect(sareesBtn).toHaveTextContent('(3)');
  });

  it('shows brand count badges from productCounts (no Math.random) when provided', () => {
    renderFilters({}, {
      categories: {},
      brands: { b1: 7, b2: 4 },
      inStock: 0,
      outOfStock: 0,
    });
    const brandOneLabel = screen.getByText('Brand One').closest('label')!;
    expect(brandOneLabel).toHaveTextContent('(7)');
    const brandTwoLabel = screen.getByText('Brand Two').closest('label')!;
    expect(brandTwoLabel).toHaveTextContent('(4)');
    // No random values: every brand count is deterministic
    expect(brandOneLabel).not.toHaveTextContent('undefined');
  });

  it('does not show count badges when productCounts are absent', () => {
    renderFilters({}, undefined);
    const kurtisBtn = screen.getByText('Kurtis').closest('button')!;
    expect(kurtisBtn).not.toHaveTextContent('undefined');
  });
});
