import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import type { TempImage } from '../../hooks/useTempImages';
import { resolveImageUrl } from '../../utils/constants';

interface TempImageUploaderProps {
  tempImages: TempImage[];
  onAddImages: (files: File[]) => Promise<void>;
  onRemoveImage: (tempId: string) => Promise<void>;
  disabled?: boolean;
}

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * TempImageUploader — drag-and-drop image upload for new product creation.
 *
 * Features:
 * - Drag-and-drop zone with file type validation (JPEG, PNG, WebP)
 * - Image previews with hover overlay for deletion
 * - Upload progress / loading states per image
 * - Images are automatically assigned to the variant that owns this upload zone
 *
 * Only intended for new products (not edit mode).
 * Each variant card should have its own TempImageUploader instance.
 */
const TempImageUploader: React.FC<TempImageUploaderProps> = ({
  tempImages,
  onAddImages,
  onRemoveImage,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      try {
        await onAddImages(acceptedFiles);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upload images';
        toast.error(message);
      } finally {
        setUploading(false);
      }
    },
    [onAddImages],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: DEFAULT_MAX_FILES,
    maxSize: DEFAULT_MAX_SIZE,
    disabled: disabled || uploading,
  });

  const handleDelete = useCallback(
    async (tempId: string) => {
      if (!window.confirm('Remove this image?')) return;
      await onRemoveImage(tempId);
      toast.success('Image removed');
    },
    [onRemoveImage],
  );

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400'
        } ${uploading || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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

          {uploading ? (
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
              <span className="text-sm text-gray-600">Uploading...</span>
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
                JPEG, PNG, or WebP &middot; Max {DEFAULT_MAX_FILES} images,{' '}
                {DEFAULT_MAX_SIZE / 1024 / 1024}MB each
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Image Previews */}
      {tempImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tempImages.map((image) => (
            <div
              key={image.tempId}
              className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
            >
              <img
                src={resolveImageUrl(image.url)}
                alt="Preview"
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Upload error overlay */}
              {image.error && (
                <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                  <span className="text-white text-xs text-center p-2">
                    {image.error}
                  </span>
                </div>
              )}

              {/* Uploading overlay */}
              {image.uploading && !image.error && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <svg
                    className="animate-spin h-6 w-6 text-white"
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
                </div>
              )}

              {/* Hover overlay with actions (only for completed uploads) */}
              {!image.uploading && !image.error && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex flex-col items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 w-full px-2">
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image.tempId);
                      }}
                      className="p-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                      aria-label={`Remove ${image.file.name}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TempImageUploader;
