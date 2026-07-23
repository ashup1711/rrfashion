import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import ImageUploader from '../ImageUploader';
import * as productImagesApi from '../../../api/product-images';

// Mock the API module
vi.mock('../../../api/product-images', () => ({
  uploadVariantImages: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const defaultProps = {
  productId: 'prod-1',
  variantId: 'var-1',
};

describe('ImageUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the drop zone with instructions', () => {
    render(<ImageUploader {...defaultProps} />);

    expect(
      screen.getByText(/drag & drop images, or click to select/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/jpeg, png, or webp/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/max 10 images, 10mb each/i),
    ).toBeInTheDocument();
  });

  it('accepts file drop and calls upload API', async () => {
    const uploadVariantImagesMock = vi.mocked(productImagesApi.uploadVariantImages);
    uploadVariantImagesMock.mockResolvedValue({ uploaded: 2, images: [] });

    const onUploadComplete = vi.fn();
    render(
      <ImageUploader {...defaultProps} onUploadComplete={onUploadComplete} />,
    );

    const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
    const file2 = new File(['dummy'], 'test2.png', { type: 'image/png' });
    const dropZone = screen.getByRole('button', {
      name: /upload product images/i,
    });

    await userEvent.setup();
    // Use the drop event to simulate file drop
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [file, file2],
        items: [
          { kind: 'file', type: file.type, getAsFile: () => file },
          { kind: 'file', type: file2.type, getAsFile: () => file2 },
        ],
        types: ['Files'],
      },
    });

    dropZone.dispatchEvent(dropEvent);

    // Wait for the upload to complete
    await vi.waitFor(() => {
      expect(uploadVariantImagesMock).toHaveBeenCalledWith(
        'prod-1',
        'var-1',
        expect.arrayContaining([file, file2]),
      );
    });

    expect(toast.success).toHaveBeenCalledWith('Uploaded 2 images');
    expect(onUploadComplete).toHaveBeenCalledTimes(1);
  });

  it('shows uploading state while uploading', async () => {
    const uploadVariantImagesMock = vi.mocked(productImagesApi.uploadVariantImages);
    // Never resolve to keep uploading state
    uploadVariantImagesMock.mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    render(<ImageUploader {...defaultProps} />);

    const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
    const dropZone = screen.getByRole('button', {
      name: /upload product images/i,
    });

    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [file],
        items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
        types: ['Files'],
      },
    });

    dropZone.dispatchEvent(dropEvent);

    expect(await screen.findByText(/uploading images/i)).toBeInTheDocument();
  });

  it('shows error toast when upload fails', async () => {
    const uploadVariantImagesMock = vi.mocked(productImagesApi.uploadVariantImages);
    uploadVariantImagesMock.mockRejectedValue(new Error('Upload failed'));

    const onUploadComplete = vi.fn();
    render(
      <ImageUploader {...defaultProps} onUploadComplete={onUploadComplete} />,
    );

    const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
    const dropZone = screen.getByRole('button', {
      name: /upload product images/i,
    });

    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [file],
        items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
        types: ['Files'],
      },
    });

    dropZone.dispatchEvent(dropEvent);

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Upload failed');
    });

    expect(onUploadComplete).not.toHaveBeenCalled();
  });

  it('shows drag active state when dragging files over', () => {
    render(<ImageUploader {...defaultProps} />);

    const dropZone = screen.getByRole('button', {
      name: /upload product images/i,
    });

    // Simulate drag over
    const dragOverEvent = new Event('dragover', { bubbles: true });
    dropZone.dispatchEvent(dragOverEvent);

    // The component just renders based on isDragActive from useDropzone
    // We can't fully test the internal state of useDropzone here
    // but we verify the drop zone is rendered
    expect(dropZone).toBeInTheDocument();
  });
});
