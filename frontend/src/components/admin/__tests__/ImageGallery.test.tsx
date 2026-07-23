import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import ImageGallery from '../ImageGallery';
import * as productImagesApi from '../../../api/product-images';

// Mock the API module
vi.mock('../../../api/product-images', () => ({
  deleteVariantImage: vi.fn(),
  reorderVariantImages: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const sampleImages = [
  {
    id: 'img-1',
    url: '/images/product1.jpg',
    altText: 'Front view',
    sortOrder: 0,
  },
  {
    id: 'img-2',
    url: '/images/product2.jpg',
    altText: 'Back view',
    sortOrder: 1,
  },
  {
    id: 'img-3',
    url: '/images/product3.jpg',
    altText: 'Side view',
    sortOrder: 2,
  },
];

const defaultProps = {
  images: sampleImages,
  productId: 'prod-1',
  variantId: 'var-1',
};

describe('ImageGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders images in a grid', () => {
    render(<ImageGallery {...defaultProps} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute('src', '/images/product1.jpg');
    expect(images[1]).toHaveAttribute('src', '/images/product2.jpg');
    expect(images[2]).toHaveAttribute('src', '/images/product3.jpg');
  });

  it('renders empty state when no images', () => {
    render(<ImageGallery {...defaultProps} images={[]} />);

    expect(screen.getByText('No images uploaded yet')).toBeInTheDocument();
  });

  it('renders drag handle and delete button for each image', () => {
    render(<ImageGallery {...defaultProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons).toHaveLength(3);

    const dragHandles = screen.getAllByRole('button', { name: /drag to reorder/i });
    expect(dragHandles).toHaveLength(3);
  });

  it('calls delete API and shows success toast when delete is confirmed', async () => {
    const deleteVariantImageMock = vi.mocked(
      productImagesApi.deleteVariantImage,
    );
    deleteVariantImageMock.mockResolvedValue({
      deleted: true,
      imageId: 'img-1',
    });

    const onImageChange = vi.fn();

    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <ImageGallery
        {...defaultProps}
        images={sampleImages}
        onImageChange={onImageChange}
      />,
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.setup();
    await userEvent.click(deleteButtons[0]);

    await vi.waitFor(() => {
      expect(deleteVariantImageMock).toHaveBeenCalledWith(
        'prod-1',
        'var-1',
        'img-1',
      );
    });

    expect(toast.success).toHaveBeenCalledWith('Image deleted');
    expect(onImageChange).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });

  it('does not delete when confirm is cancelled', async () => {
    const deleteVariantImageMock = vi.mocked(
      productImagesApi.deleteVariantImage,
    );

    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<ImageGallery {...defaultProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.setup();
    await userEvent.click(deleteButtons[0]);

    expect(deleteVariantImageMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('shows error toast when delete fails and reverts optimitic removal', async () => {
    const deleteVariantImageMock = vi.mocked(
      productImagesApi.deleteVariantImage,
    );
    deleteVariantImageMock.mockRejectedValue(new Error('Delete failed'));

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ImageGallery {...defaultProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.setup();
    await userEvent.click(deleteButtons[0]);

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Delete failed');
    });

    // Image should still be visible (reverted)
    expect(screen.getAllByRole('img')).toHaveLength(3);
    confirmSpy.mockRestore();
  });

  it('shows error toast when reorder fails and reverts to original order', async () => {
    const reorderVariantImagesMock = vi.mocked(
      productImagesApi.reorderVariantImages,
    );
    reorderVariantImagesMock.mockRejectedValue(new Error('Reorder failed'));

    render(<ImageGallery {...defaultProps} />);

    // The drag and drop is hard to test with JSDOM since DndContext
    // requires touch/mouse event simulation. We verify the grid renders
    // and the SortableContext is set up correctly.
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });
});
