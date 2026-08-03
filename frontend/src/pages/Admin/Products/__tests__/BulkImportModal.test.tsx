import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BulkImportModal from '../BulkImportModal';

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }: { onDrop: (files: File[]) => void }) => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
    onDrop,
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

const renderModal = (isOpen = true, onClose = vi.fn()) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BulkImportModal isOpen={isOpen} onClose={onClose} />
    </QueryClientProvider>
  );
};

describe('BulkImportModal', () => {
  it('renders when open', () => {
    renderModal(true);
    expect(screen.getByText('Bulk Import Products')).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop a CSV file/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderModal(false);
    expect(screen.queryByText('Bulk Import Products')).not.toBeInTheDocument();
  });

  it('shows cancel button', () => {
    renderModal(true);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows upload button as disabled when no file selected', () => {
    renderModal(true);
    const uploadBtn = screen.getByText('Import Products');
    expect(uploadBtn.closest('button')).toBeDisabled();
  });

  it('has a dropzone area', () => {
    renderModal(true);
    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });
});
