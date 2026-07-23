import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import SizeGuide from '../SizeGuide';

const renderGuide = (category: 'kurti' | 'blouse' | 'gown' | 'lehenga' = 'kurti') =>
  render(<SizeGuide isOpen onClose={() => {}} category={category} />);

describe('SizeGuide', () => {
  it('renders the size table for the kurti category', () => {
    renderGuide('kurti');
    expect(screen.getByRole('heading', { name: /size guide/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /kurti length/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /blouse length/i })).toBeInTheDocument();
  });

  it('renders Indian size columns (XS, S, M, L, XL, XXL) and Indian ethnic-wear measurements', () => {
    renderGuide('kurti');

    ['XS', 'S', 'M', 'L', 'XL', 'XXL'].forEach((size) => {
      expect(screen.getByRole('cell', { name: size })).toBeInTheDocument();
    });

    const xsRow = screen.getByRole('row', { name: /xs/i });
    expect(within(xsRow).getByText('32"')).toBeInTheDocument();
    expect(within(xsRow).getByText('26"')).toBeInTheDocument();
    expect(within(xsRow).getByText('35"')).toBeInTheDocument();
    expect(within(xsRow).getByText('44"')).toBeInTheDocument();
    expect(within(xsRow).getByText('14"')).toBeInTheDocument();
  });

  it('renders the saree blouse chart with the same Indian sizing', () => {
    renderGuide('blouse');
    const xsRow = screen.getByRole('row', { name: /xs/i });
    expect(within(xsRow).getByText('XS')).toBeInTheDocument();
    expect(within(xsRow).getByText('32"')).toBeInTheDocument();
  });

  it('does not render the dialog when isOpen is false', () => {
    render(<SizeGuide isOpen={false} onClose={() => {}} category="kurti" />);
    expect(screen.queryByRole('heading', { name: /size guide/i })).not.toBeInTheDocument();
  });
});
