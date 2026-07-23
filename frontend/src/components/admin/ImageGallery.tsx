import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { deleteVariantImage, reorderVariantImages } from '../../api/product-images';

interface GalleryImage {
  id: string;
  url: string;
  altText?: string;
  sortOrder: number;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  productId: string;
  variantId: string;
  onImageChange?: () => void;
}

interface SortableImageProps {
  image: GalleryImage;
  onDelete: (id: string) => void;
}

const SortableImage = ({ image, onDelete }: SortableImageProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }),
    [transform, transition, isDragging],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
    >
      <img
        src={image.url}
        alt={image.altText || 'Product image'}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          {/* Drag handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-2 bg-white rounded-full shadow hover:bg-gray-100 text-gray-700"
            aria-label={`Drag to reorder ${image.altText || 'image'}`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </button>
          {/* Delete button */}
          <button
            type="button"
            onClick={() => onDelete(image.id)}
            className="p-2 bg-red-500 text-white rounded-full shadow hover:bg-red-600 transition-colors"
            aria-label={`Delete ${image.altText || 'image'}`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const ImageGallery = ({
  images,
  productId,
  variantId,
  onImageChange,
}: ImageGalleryProps) => {
  const [localImages, setLocalImages] = useState<GalleryImage[]>(images);

  // Keep local state in sync when prop changes
  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = localImages.findIndex((img) => img.id === active.id);
      const newIndex = localImages.findIndex((img) => img.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newImages = arrayMove(localImages, oldIndex, newIndex).map(
        (img, index) => ({
          ...img,
          sortOrder: index,
        }),
      );

      // Optimistic update
      setLocalImages(newImages);

      try {
        await reorderVariantImages(
          productId,
          variantId,
          newImages.map((img) => ({
            imageId: img.id,
            sortOrder: img.sortOrder,
          })),
        );
        onImageChange?.();
      } catch (error) {
        // Revert on failure
        setLocalImages(localImages);
        const message =
          error instanceof Error ? error.message : 'Failed to reorder images';
        toast.error(message);
      }
    },
    [localImages, productId, variantId, onImageChange],
  );

  const handleDelete = useCallback(
    async (imageId: string) => {
      if (!window.confirm('Are you sure you want to delete this image?')) return;

      // Optimistic update
      const previousImages = localImages;
      setLocalImages((prev) => prev.filter((img) => img.id !== imageId));

      try {
        await deleteVariantImage(productId, variantId, imageId);
        toast.success('Image deleted');
        onImageChange?.();
      } catch (error) {
        // Revert on failure
        setLocalImages(previousImages);
        const message =
          error instanceof Error ? error.message : 'Failed to delete image';
        toast.error(message);
      }
    },
    [localImages, productId, variantId, onImageChange],
  );

  if (localImages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No images uploaded yet
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localImages.map((img) => img.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {localImages.map((image) => (
            <SortableImage key={image.id} image={image} onDelete={handleDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default ImageGallery;
