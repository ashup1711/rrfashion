import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { uploadVariantImagesAsync } from '../../api/product-images';
import UploadProgressTracker from '../common/UploadProgressTracker';

interface ImageUploaderProps {
  productId: string;
  variantId: string;
  onUploadComplete?: () => void;
  maxFiles?: number;
  maxSize?: number;
}

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ImageUploader = ({
  productId,
  variantId,
  onUploadComplete,
  maxFiles = DEFAULT_MAX_FILES,
  maxSize = DEFAULT_MAX_SIZE,
}: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);

      try {
        const result = await uploadVariantImagesAsync(productId, variantId, acceptedFiles);
        setUploadId(result.uploadId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to start upload';
        toast.error(message);
        setUploading(false);
      }
    },
    [productId, variantId],
  );

  const handleComplete = useCallback(() => {
    setUploading(false);
    setUploadId(null);
    toast.success('Images uploaded successfully');
    onUploadComplete?.();
  }, [onUploadComplete]);

  const handleError = useCallback((error: string) => {
    setUploading(false);
    setUploadId(null);
    toast.error(error);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles,
    maxSize,
    disabled: uploading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Upload product images"
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          {/* Upload icon */}
          <svg
            className="w-12 h-12 text-gray-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {uploading && !uploadId ? (
            <div className="flex items-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="text-sm text-gray-600">Uploading images...</span>
            </div>
          ) : isDragActive ? (
            <p className="text-sm text-primary-600 font-medium">
              Drop images here...
            </p>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Drag & drop images, or click to select
              </p>
              <p className="text-xs text-gray-500">
                JPEG, PNG, or WebP &middot; Max {maxFiles} images,{' '}
                {Math.round(maxSize / 1024 / 1024)}MB each
              </p>
            </div>
          )}
        </div>
      </div>

      {uploadId && (
        <div className="mt-4">
          <UploadProgressTracker
            uploadId={uploadId}
            onComplete={handleComplete}
            onError={handleError}
          />
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
