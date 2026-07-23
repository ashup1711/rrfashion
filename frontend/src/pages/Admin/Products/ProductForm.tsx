import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import {
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useProductVariants,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
} from '../../../hooks/useProducts';
import { useCategories } from '../../../hooks/useCategories';
import { useBrands } from '../../../hooks/useBrands';
import { useStores } from '../../../hooks/useStores';
import { getInventorySummary } from '../../../api/inventory';
import { ROUTES } from '../../../utils/constants';
import ImageUploader from '../../../components/admin/ImageUploader';
import ImageGallery from '../../../components/admin/ImageGallery';
import TempImageUploader from '../../../components/admin/TempImageUploader';
import { useTempImages } from '../../../hooks/useTempImages';
import type { TempImage } from '../../../hooks/useTempImages';
import { promoteImages } from '../../../api/product-images';

interface VariantFormData {
  id?: string;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  salePrice: string;
  rentPricePerDay: string;
  securityDeposit: string;
  initialStock: { storeId: string; quantity: number }[];
}

const emptyVariant: VariantFormData = {
  size: '',
  color: '',
  sku: '',
  barcode: '',
  salePrice: '',
  rentPricePerDay: '',
  securityDeposit: '',
  initialStock: [],
};

const ProductForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: product, isLoading: productLoading } = useProduct(id || '');
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: stores } = useStores();
  const { data: existingVariants } = useProductVariants(id || '');
  const queryClient = useQueryClient();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    basePrice: '',
    salePrice: '',
    categoryId: '',
    brandId: '',
    fabric: '',
    hsnCode: '',
    isRentable: false,
    isSellable: true,
    isFeatured: false,
    isActive: true,
    careInstructions: '',
    sortPriority: '0',
  });

  const [variants, setVariants] = useState<VariantFormData[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [promotionErrors, setPromotionErrors] = useState<string[]>([]);

  const {
    tempImages,
    addImages: addTempImages,
    removeImage: removeTempImage,
    clearAll: clearTempImages,
    isLoading: tempImagesLoading,
  } = useTempImages();

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        basePrice: String(product.basePrice ?? ''),
        salePrice: product.salePrice ? String(product.salePrice) : '',
        categoryId: product.categoryId || '',
        brandId: product.brandId || '',
        fabric: product.fabric || '',
        hsnCode: product.hsnCode || '',
        isRentable: product.isRentable ?? false,
        isSellable: product.isSellable ?? true,
        isFeatured: product.isFeatured ?? false,
        isActive: product.isActive ?? true,
        careInstructions: product.careInstructions || '',
        sortPriority: String(product.sortPriority ?? 0),
      });
    }
  }, [product]);

  // Populate variants when editing
  useEffect(() => {
    if (existingVariants && existingVariants.length > 0) {
      const variantIds = existingVariants.map((v) => v.id);

      setVariants(
        existingVariants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          sku: v.sku,
          barcode: v.barcode || '',
          salePrice: v.salePrice ? String(v.salePrice) : '',
          rentPricePerDay: v.rentPricePerDay ? String(v.rentPricePerDay) : '',
          securityDeposit: v.securityDeposit ? String(v.securityDeposit) : '',
          initialStock: [],
        })),
      );

      getInventorySummary({
        variantIds: variantIds.join(','),
        limit: 100,
      }).then((data) => {
        setVariants((prev) =>
          prev.map((v) => {
            const items = data.items.filter(
              (inv) => inv.variantId === v.id,
            );
            if (items.length === 0) return v;
            return {
              ...v,
              initialStock: items.map((inv) => ({
                storeId: inv.storeId,
                quantity: inv.quantityAvailable,
              })),
            };
          }),
        );
      });
    }
  }, [existingVariants]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleVariantChange = (
    index: number,
    field: keyof VariantFormData,
    value: string,
  ) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleVariantInitialStockChange = (
    index: number,
    storeId: string,
    value: string,
  ) => {
    setVariants((prev) => {
      const updated = [...prev];
      const existing = updated[index].initialStock;
      const qty = value === '' ? 0 : parseInt(value, 10);
      const idx = existing.findIndex((s) => s.storeId === storeId);
      if (idx >= 0) {
        const newStock = [...existing];
        newStock[idx] = { storeId, quantity: isNaN(qty) ? 0 : qty };
        updated[index] = { ...updated[index], initialStock: newStock };
      } else {
        updated[index] = {
          ...updated[index],
          initialStock: [
            ...existing,
            { storeId, quantity: isNaN(qty) ? 0 : qty },
          ],
        };
      }
      return updated;
    });
  };

  const addVariant = () => {
    setVariants((prev) => [...prev, { ...emptyVariant }]);
  };

  const removeVariant = async (index: number) => {
    const variant = variants[index];
    if (variant.id) {
      try {
        await deleteVariant.mutateAsync(variant.id);
      } catch {
        // Continue with removal even if API fails
      }
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    if (!formData.name.trim()) {
      setFormError('Product name is required');
      return false;
    }
    if (!formData.basePrice || Number(formData.basePrice) <= 0) {
      setFormError('Valid base price is required');
      return false;
    }
    if (!formData.categoryId) {
      setFormError('Category is required');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setFormError('');
    setPromotionErrors([]);

    try {
      const productData = {
        name: formData.name,
        slug: formData.slug || undefined,
        description: formData.description || undefined,
        basePrice: Number(formData.basePrice),
        salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
        categoryId: formData.categoryId,
        brandId: formData.brandId || undefined,
        fabric: formData.fabric || undefined,
        hsnCode: formData.hsnCode || undefined,
        isRentable: formData.isRentable,
        isSellable: formData.isSellable,
        isFeatured: formData.isFeatured,
        isActive: formData.isActive,
        careInstructions: formData.careInstructions || undefined,
        sortPriority: formData.sortPriority ? Number(formData.sortPriority) : 0,
      };

      let productId: string;

      if (isEdit && id) {
        await updateProduct.mutateAsync({ id, data: productData });
        productId = id;
      } else {
        const created = await createProduct.mutateAsync(productData);
        productId = created.id;
      }

      // Save variants and collect their IDs
      const savedVariantIds: { index: number; id: string }[] = [];

      for (let index = 0; index < variants.length; index++) {
        const variant = variants[index];
        const initialStock = variant.initialStock?.filter(
          (s) => s.quantity > 0,
        );

        const variantData = {
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          barcode: variant.barcode || undefined,
          salePrice: variant.salePrice ? Number(variant.salePrice) : undefined,
          rentPricePerDay: variant.rentPricePerDay
            ? Number(variant.rentPricePerDay)
            : undefined,
          securityDeposit: variant.securityDeposit
            ? Number(variant.securityDeposit)
            : undefined,
          initialStock: initialStock?.length ? initialStock : undefined,
        };

        if (variant.id) {
          await updateVariant.mutateAsync({ id: variant.id, data: variantData });
          savedVariantIds.push({ index, id: variant.id });
        } else {
          const createdVariant = await createVariant.mutateAsync({
            productId,
            data: variantData,
          });
          savedVariantIds.push({ index, id: createdVariant.id });
        }
      }

      // Promote temp images to variants (only for new products or when temp images exist)
      if (tempImages.length > 0) {
        const errors: string[] = [];

        // Group temp images by their assigned variant index
        const imagesByVariant = new Map<number, TempImage[]>();
        for (const img of tempImages) {
          const existing = imagesByVariant.get(img.assignedVariantIndex) || [];
          existing.push(img);
          imagesByVariant.set(img.assignedVariantIndex, existing);
        }

        // Promote images for each variant group
        for (const [variantIndex, images] of imagesByVariant) {
          const variantIdEntry = savedVariantIds.find(
            (v) => v.index === variantIndex,
          );

          if (!variantIdEntry) {
            errors.push(
              `Could not assign images to variant ${variantIndex + 1}: variant not found`,
            );
            continue;
          }

          try {
            await promoteImages(
              productId,
              variantIdEntry.id,
              images.map((img, idx) => ({
                tempId: img.tempId,
                storageKey: img.storageKey,
                sortOrder: idx,
              })),
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            errors.push(
              `Failed to assign images to variant ${variantIndex + 1}: ${msg}`,
            );
          }
        }

        if (errors.length > 0) {
          setPromotionErrors(errors);
          setFormError(
            'Product saved, but some images could not be assigned. See details below.',
          );
          // Don't navigate away — let the user see errors and retry
          return;
        }

        // Clear temp images on full success
        clearTempImages();
      }

      navigate(ROUTES.ADMIN_PRODUCTS);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save product',
      );
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && productLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Product' : 'Add Product'}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {isEdit
            ? `Editing: ${product?.name || ''}`
            : 'Create a new product with variants'}
        </p>
      </div>

      {formError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g. Printed Cotton Kurta"
            />
            <Input
              label="Slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="Auto-generated if empty"
              helperText="URL-friendly identifier"
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                placeholder="Product description..."
              />
            </div>
          </div>
        </Card>

        {/* Pricing & Classification */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pricing & Classification
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Base Price (₹)"
              name="basePrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.basePrice}
              onChange={handleChange}
              required
              placeholder="1299"
            />
            <Input
              label="Sale Price (₹)"
              name="salePrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.salePrice}
              onChange={handleChange}
              placeholder="999"
            />
            <Input
              label="Sort Priority"
              name="sortPriority"
              type="number"
              min="0"
              value={formData.sortPriority}
              onChange={handleChange}
              helperText="Higher = appears first"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select category</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <select
                name="brandId"
                value={formData.brandId}
                onChange={handleChange}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select brand</option>
                {brands?.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Fabric"
              name="fabric"
              value={formData.fabric}
              onChange={handleChange}
              placeholder="e.g. Cotton, Silk"
            />
            <Input
              label="HSN Code"
              name="hsnCode"
              value={formData.hsnCode}
              onChange={handleChange}
              placeholder="e.g. 6204.42"
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isSellable"
                checked={formData.isSellable}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Available for Sale</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isRentable"
                checked={formData.isRentable}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Available for Rent</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Featured Product</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
        </Card>

        {/* Promotion Errors */}
        {promotionErrors.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              Image Assignment Warnings:
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              {promotionErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
            <p className="text-xs text-yellow-600 mt-2">
              You can edit the product to manage images.
            </p>
          </div>
        )}

        {/* Variants */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Variants</h2>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              + Add Variant
            </Button>
          </div>

          {variants.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No variants yet. Click "Add Variant" to add size/color combinations.
            </p>
          ) : (
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg relative"
                >
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-600 transition-colors"
                    aria-label={`Remove variant ${index + 1}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pr-8">
                    <Input
                      label="Size"
                      value={variant.size}
                      onChange={(e) =>
                        handleVariantChange(index, 'size', e.target.value)
                      }
                      placeholder="M, L, XL"
                      required
                    />
                    <Input
                      label="Color"
                      value={variant.color}
                      onChange={(e) =>
                        handleVariantChange(index, 'color', e.target.value)
                      }
                      placeholder="Blue, Red"
                      required
                    />
                    <Input
                      label="SKU"
                      value={variant.sku}
                      onChange={(e) =>
                        handleVariantChange(index, 'sku', e.target.value)
                      }
                      placeholder="KUR-BL-M"
                      required
                    />
                    <Input
                      label="Barcode"
                      value={variant.barcode}
                      onChange={(e) =>
                        handleVariantChange(index, 'barcode', e.target.value)
                      }
                      placeholder="Optional"
                    />
                    <Input
                      label="Sale Price (₹)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={variant.salePrice}
                      onChange={(e) =>
                        handleVariantChange(index, 'salePrice', e.target.value)
                      }
                      placeholder="999"
                    />
                    <Input
                      label="Rent Price/Day (₹)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={variant.rentPricePerDay}
                      onChange={(e) =>
                        handleVariantChange(
                          index,
                          'rentPricePerDay',
                          e.target.value,
                        )
                      }
                      placeholder="150"
                    />
                    <Input
                      label="Security Deposit (₹)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={variant.securityDeposit}
                      onChange={(e) =>
                        handleVariantChange(
                          index,
                          'securityDeposit',
                          e.target.value,
                        )
                      }
                      placeholder="500"
                    />
                  <div className="flex items-end pb-2">
                    {variant.id && (
                      <Badge variant="info">Existing</Badge>
                    )}
                  </div>
                </div>

                {/* Stock Levels */}
                <details open className="mt-3 group">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none font-medium">
                    Stock Levels
                    <span className="ml-1 text-gray-400 group-open:rotate-90 inline-block transition-transform">&#9654;</span>
                  </summary>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {stores?.map((store) => (
                      <Input
                        key={store.id}
                        label={`${store.name} Stock`}
                        type="number"
                        min="0"
                        value={variant.initialStock?.find((s) => s.storeId === store.id)?.quantity?.toString() ?? ''}
                        onChange={(e) => handleVariantInitialStockChange(index, store.id, e.target.value)}
                        placeholder="0"
                      />
                    ))}
                  </div>
                </details>

                {/* Variant Images Upload */}
                {!isEdit && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Images for {variant.size} / {variant.color}
                    </h4>
                    <TempImageUploader
                      tempImages={tempImages.filter(img => img.assignedVariantIndex === index)}
                      onAddImages={(files) => addTempImages(files, index)}
                      onRemoveImage={removeTempImage}
                      disabled={saving}
                    />
                    {tempImages.filter(img => img.assignedVariantIndex === index).length > 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        {tempImages.filter(img => img.assignedVariantIndex === index).length} image(s) assigned
                      </p>
                    )}
                  </div>
                )}
              </div>
              ))}
            </div>
          )}
        </Card>

        {/* Variant Images */}
        {variants.length > 0 && variants.some((v) => v.id) && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Variant Images
            </h2>
            <div className="space-y-6">
              {variants
                .filter((v) => v.id)
                .map((variant) => {
                  const existing = existingVariants?.find(
                    (ev: any) => ev.id === variant.id,
                  );
                  const variantImages = existing?.images || [];
                  return (
                    <div
                      key={variant.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        {variant.size} / {variant.color}
                      </h3>
                      <ImageGallery
                        images={variantImages}
                        productId={id || ''}
                        variantId={variant.id!}
                        onImageChange={() => {
                          queryClient.invalidateQueries({ queryKey: ['product', id] });
                          queryClient.invalidateQueries({ queryKey: ['productVariants', id] });
                        }}
                      />
                      <div className="mt-3">
                        <ImageUploader
                          productId={id || ''}
                          variantId={variant.id!}
                          onUploadComplete={() => {
                            queryClient.invalidateQueries({ queryKey: ['product', id] });
                            queryClient.invalidateQueries({ queryKey: ['productVariants', id] });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        )}

        {/* Care Instructions */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Additional Details
          </h2>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Care Instructions
          </label>
          <textarea
            name="careInstructions"
            value={formData.careInstructions}
            onChange={handleChange}
            rows={2}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
            placeholder="Machine wash cold, tumble dry low..."
          />
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTES.ADMIN_PRODUCTS)}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {isEdit ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
