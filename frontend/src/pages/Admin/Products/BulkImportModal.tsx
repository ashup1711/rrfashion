import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { useBulkImportProducts } from '../../../hooks/useProducts';
import type { BulkImportResult } from '../../../api/products';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * BulkImportModal — REQ-FE-010
 *
 * CSV upload component with drag-and-drop for bulk product import.
 * Shows upload progress, validation errors, and import results.
 */
const BulkImportModal = ({ isOpen, onClose }: BulkImportModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const { mutate: importProducts, isPending, error } = useBulkImportProducts();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB — matches SEC-09/SEC-11 backend limit
  });

  const handleUpload = useCallback(() => {
    if (!selectedFile) return;

    importProducts(selectedFile, {
      onSuccess: (data) => {
        setResult(data);
      },
      onError: () => {
        // Error is handled by the mutation state
      },
    });
  }, [selectedFile, importProducts]);

  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    onClose();
  }, [onClose]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Import Products">
      <div className="space-y-6">
        {/* Upload Zone */}
        {!result && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
            role="button"
            aria-label="Drop CSV file here or click to browse"
          >
            <input {...getInputProps()} aria-label="Upload CSV file" />
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {isDragActive ? (
              <p className="text-primary-600 font-medium">Drop the CSV file here</p>
            ) : (
              <div>
                <p className="text-gray-700 font-medium">
                  Drag and drop a CSV file here, or click to browse
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports CSV files up to 5 MB
                </p>
              </div>
            )}
          </div>
        )}

        {/* Selected File Info */}
        {selectedFile && !result && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <svg className="w-8 h-8 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Remove selected file"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              Import failed. Please check your CSV format and try again.
            </p>
          </div>
        )}

        {/* Import Results */}
        {result && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${result.errors > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
              <h3 className={`font-medium ${result.errors > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                Import Complete
              </h3>
              <div className="mt-2 text-sm space-y-1">
                <p className={result.errors > 0 ? 'text-yellow-700' : 'text-green-700'}>
                  Successfully imported: {result.imported} of {result.total} products
                </p>
                {result.errors > 0 && (
                  <p className="text-yellow-700">
                    Failed: {result.errors} product{result.errors !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Error Details */}
            {result.details && result.details.length > 0 && (
              <div className="max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-gray-600 mb-2">Error Details:</p>
                <div className="space-y-1">
                  {result.details.map((err, idx) => (
                    <div key={idx} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      <span className="font-medium">Row {err.row}:</span> {err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              onClick={handleUpload}
              isLoading={isPending}
              disabled={!selectedFile || isPending}
            >
              {isPending ? 'Importing...' : 'Import Products'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default BulkImportModal;
