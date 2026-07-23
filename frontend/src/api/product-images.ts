import { adminClient } from './admin-client';
import type { ProductImage } from '../types/product';

interface UploadResponse {
  uploaded: number;
  images: ProductImage[];
}

interface ReorderPayload {
  orders: { imageId: string; sortOrder: number }[];
}

interface ReorderResponse {
  reordered: number;
}

/**
 * Upload images for a specific product variant.
 * Sends multipart/form-data with the 'images' field.
 */
export const uploadVariantImages = async (
  productId: string,
  variantId: string,
  files: File[],
): Promise<UploadResponse> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const { data } = await adminClient.post<UploadResponse>(
    `/products/${productId}/variants/${variantId}/images`,
    formData,
  );
  return data;
};

/**
 * Upload images for a specific product variant (async two-step flow).
 * Returns immediately with uploadId for SSE progress tracking.
 */
export const uploadVariantImagesAsync = async (
  productId: string,
  variantId: string,
  files: File[],
): Promise<{ uploadId: string; status: string }> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  const { data } = await adminClient.post<{ uploadId: string; status: string }>(
    `/products/${productId}/variants/${variantId}/images`,
    formData,
  );
  return data;
};

/**
 * Delete a single image from a variant.
 */
export const deleteVariantImage = async (
  productId: string,
  variantId: string,
  imageId: string,
): Promise<{ deleted: boolean; imageId: string }> => {
  const { data } = await adminClient.delete<{ deleted: boolean; imageId: string }>(
    `/products/${productId}/variants/${variantId}/images/${imageId}`,
  );
  return data;
};

/**
 * Reorder images for a variant.
 */
export const reorderVariantImages = async (
  productId: string,
  variantId: string,
  orders: { imageId: string; sortOrder: number }[],
): Promise<ReorderResponse> => {
  const { data } = await adminClient.patch<ReorderResponse>(
    `/products/${productId}/variants/${variantId}/images/reorder`,
    { orders } as ReorderPayload,
  );
  return data;
};

// ──────────────────────────────────────────────
// Temporary Image Upload (Two-Stage Flow)
// ──────────────────────────────────────────────

export interface TempImageResponse {
  tempId: string;
  url: string;
  storageKey: string;
  expiresAt: string;
}

export interface PromoteImageRequest {
  tempId: string;
  storageKey: string;
  altText?: string;
  sortOrder: number;
}

export interface PromotedImage {
  id: string;
  url: string;
  variantId: string;
  sortOrder: number;
  variantType: string;
}

/**
 * Upload a temporary image for new product creation.
 * Image is stored in temp/ location and expires after 24 hours.
 * Uses multipart/form-data with field name 'file'.
 */
export const uploadTempImage = async (file: File): Promise<TempImageResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await adminClient.post<TempImageResponse>('/upload/temp', formData);
  return data;
};

/**
 * Delete a temporary image before it's promoted.
 * Best-effort deletion - the cleanup job handles expired entries.
 */
export const deleteTempImage = async (tempId: string): Promise<void> => {
  await adminClient.delete(`/upload/temp/${tempId}`);
};

/**
 * Promote temporary images to permanent product variant images.
 * Called after product and variants are saved.
 * Processes images through Sharp to generate ORIGINAL/MEDIUM/THUMBNAIL variants.
 */
export const promoteImages = async (
  productId: string,
  variantId: string,
  tempImages: PromoteImageRequest[],
): Promise<{ images: PromotedImage[] }> => {
  const { data } = await adminClient.post<{ images: PromotedImage[] }>(
    `/products/${productId}/variants/${variantId}/promote-images`,
    { tempImages },
  );
  return data;
};
