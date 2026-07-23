import { useState, useCallback } from 'react';
import { uploadTempImage, deleteTempImage } from '../api/product-images';

export interface TempImage {
  tempId: string;
  url: string;
  storageKey: string;
  file: File;
  assignedVariantIndex: number;
  uploading: boolean;
  error?: string;
}

export interface UseTempImagesReturn {
  tempImages: TempImage[];
  addImages: (files: File[], defaultVariantIndex: number) => Promise<void>;
  removeImage: (tempId: string) => Promise<void>;
  assignVariant: (tempId: string, variantIndex: number) => void;
  clearAll: () => void;
  isLoading: boolean;
}

/**
 * Hook for managing temporary product images during new product creation.
 *
 * - Uploads files to the temp upload endpoint
 * - Shows optimistic UI (placeholder entries immediately, updates on completion)
 * - Supports variant assignment management
 * - Handles individual deletion with best-effort backend cleanup
 */
export const useTempImages = (): UseTempImagesReturn => {
  const [tempImages, setTempImages] = useState<TempImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addImages = useCallback(async (files: File[], defaultVariantIndex: number) => {
    if (files.length === 0) return;

    setIsLoading(true);

    // Create placeholder entries for immediate UI feedback
    const placeholders: TempImage[] = files.map((file) => ({
      tempId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      url: URL.createObjectURL(file),
      storageKey: '',
      file,
      assignedVariantIndex: defaultVariantIndex,
      uploading: true,
    }));

    setTempImages((prev) => [...prev, ...placeholders]);

    // Upload each file to the temp endpoint
    const uploadPromises = files.map(async (file, index) => {
      const placeholder = placeholders[index];
      try {
        const result = await uploadTempImage(file);

        setTempImages((prev) =>
          prev.map((img) =>
            img.tempId === placeholder.tempId
              ? {
                  ...img,
                  tempId: result.tempId,
                  storageKey: result.storageKey,
                  url: result.url,
                  uploading: false,
                }
              : img,
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Upload failed';

        setTempImages((prev) =>
          prev.map((img) =>
            img.tempId === placeholder.tempId
              ? { ...img, uploading: false, error: message }
              : img,
          ),
        );
      }
    });

    await Promise.all(uploadPromises);
    setIsLoading(false);
  }, []);

  const removeImage = useCallback(async (tempId: string) => {
    // Optimistically remove from UI
    setTempImages((prev) => prev.filter((img) => img.tempId !== tempId));

    // Only hit backend if the image was actually uploaded (not a pending placeholder)
    if (!tempId.startsWith('pending-')) {
      try {
        await deleteTempImage(tempId);
      } catch (error) {
        // Silently fail — the cleanup cron job will handle expired entries
        console.error('Failed to delete temp image from backend:', error);
      }
    }
  }, []);

  const assignVariant = useCallback((tempId: string, variantIndex: number) => {
    setTempImages((prev) =>
      prev.map((img) =>
        img.tempId === tempId ? { ...img, assignedVariantIndex: variantIndex } : img,
      ),
    );
  }, []);

  const clearAll = useCallback(() => {
    setTempImages([]);
  }, []);

  return {
    tempImages,
    addImages,
    removeImage,
    assignVariant,
    clearAll,
    isLoading,
  };
};
