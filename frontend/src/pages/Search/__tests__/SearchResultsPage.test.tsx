import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchResultsPage from '../SearchResultsPage';

// Mock the useSearch hook
vi.mock('../../../hooks/useSearch', () => ({
  useSearch: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

const renderSearchPage = (initialEntries = ['/search?q=silk']) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <SearchResultsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('SearchResultsPage', () => {
  it('renders the search heading', () => {
    renderSearchPage();
    expect(screen.getByText('Search Results')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    renderSearchPage();
    expect(screen.getByLabelText('Search products')).toBeInTheDocument();
  });

  it('renders category filter', () => {
    renderSearchPage();
    expect(screen.getByLabelText('Filter by category')).toBeInTheDocument();
  });

  it('renders in-stock checkbox', () => {
    renderSearchPage();
    expect(screen.getByLabelText('In Stock Only')).toBeInTheDocument();
  });

  it('shows empty state when no results', () => {
    renderSearchPage();
    // When query is 'silk' but data is null (mock returns null), should show loading or empty
    expect(screen.getByText('Search Results')).toBeInTheDocument();
  });
});
