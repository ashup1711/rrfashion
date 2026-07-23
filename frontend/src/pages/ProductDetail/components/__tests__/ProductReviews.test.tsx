import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductReviews from '../ProductReviews';
import * as reviewsModule from '../../../../hooks/useReviews';
import * as authStoreModule from '../../../../store/authStore';

// Mock hooks at module level
const mockMutateAsync = vi.fn();

vi.mock('../../../../hooks/useReviews', () => ({
  useReviews: vi.fn(),
  useCreateReview: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

vi.mock('../../../../store/authStore', () => ({
  useAuthStore: vi.fn((selector: any) =>
    selector({ isAuthenticated: true }),
  ),
}));

const mockedUseReviews = vi.mocked(reviewsModule.useReviews);
const mockedUseAuthStore = vi.mocked(authStoreModule.useAuthStore);

const renderComponent = (productId = 'test-product-1') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductReviews productId={productId} />
    </QueryClientProvider>,
  );
};

describe('ProductReviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should open the review modal when "Write a Review" is clicked', () => {
    mockedUseReviews.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    } as any);

    renderComponent();
    fireEvent.click(screen.getByText('Write a Review'));
    expect(screen.getByText('Rating')).toBeInTheDocument();
    expect(screen.getByText('Review Comment')).toBeInTheDocument();
    // Order Item ID should NOT be present
    expect(screen.queryByText('Order Item ID')).not.toBeInTheDocument();
  });

  it('should submit a review with productId, rating, and comment', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'new-review' });
    mockedUseReviews.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    } as any);

    renderComponent();
    fireEvent.click(screen.getByText('Write a Review'));

    // Type a comment
    const textarea = screen.getByPlaceholderText(
      'What did you like or dislike about this product?',
    );
    fireEvent.change(textarea, { target: { value: 'Amazing product!' } });

    // Submit
    fireEvent.click(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        productId: 'test-product-1',
        rating: 5,
        comment: 'Amazing product!',
      });
    });
  });

  it('should not show Order Item ID field', () => {
    mockedUseReviews.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    } as any);

    renderComponent();
    fireEvent.click(screen.getByText('Write a Review'));
    expect(screen.queryByText(/Order Item ID/i)).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/Enter Order Item ID/i),
    ).not.toBeInTheDocument();
  });

  it('should require authentication to write a review', () => {
    mockedUseReviews.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    } as any);
    mockedUseAuthStore.mockImplementation((selector: any) =>
      selector({ isAuthenticated: false }),
    );

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();
    fireEvent.click(screen.getByText('Write a Review'));
    expect(alertSpy).toHaveBeenCalledWith('Please login to write a review');
    alertSpy.mockRestore();
  });

  it('should show loading state', () => {
    mockedUseReviews.mockReturnValue({
      data: null,
      isLoading: true,
    } as any);

    renderComponent();
    expect(screen.getByText('Loading reviews...')).toBeInTheDocument();
  });

  it('should show empty state when no approved reviews exist', () => {
    mockedUseReviews.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    } as any);

    renderComponent();
    expect(screen.getByText(/No approved reviews yet/)).toBeInTheDocument();
  });
});
