import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/test-utils';
import ColorList from '../ColorList';

vi.mock('../../../../hooks/useColors', () => ({
  useColors: () => ({
    data: [
      { id: 'c1', name: 'Black', hexCode: '#000000', isActive: true, sortOrder: 0 },
      { id: 'c2', name: 'White', hexCode: '#FFFFFF', isActive: true, sortOrder: 1 },
    ],
    isLoading: false,
    error: null,
  }),
  useCreateColor: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
  useUpdateColor: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
  useDeleteColor: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}));

describe('ColorList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the color list page', () => {
    renderWithProviders(<ColorList />);
    expect(screen.getByText('Colors')).toBeInTheDocument();
    expect(screen.getByText('Black')).toBeInTheDocument();
    expect(screen.getByText('White')).toBeInTheDocument();
  });

  it('opens the create modal when Add Color is clicked', () => {
    renderWithProviders(<ColorList />);
    fireEvent.click(screen.getByText('+ Add Color'));
    expect(screen.getByText('Add Color')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Navy Blue')).toBeInTheDocument();
  });
});
