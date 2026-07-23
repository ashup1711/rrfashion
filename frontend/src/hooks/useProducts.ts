import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  getProducts,
  getProduct,
  getProductCounts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductVariants,
  createVariant,
  updateVariant,
  deleteVariant,
} from '../api/products';
import { QUERY_KEYS } from '../utils/constants';
import type { ProductFilters, CreateProductData, ProductCountsResponse } from '../types/product';
import type { CreateVariantData } from '../types/product';

export const useProducts = (filters?: ProductFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.products, filters],
    queryFn: () => getProducts(filters),
    refetchOnWindowFocus: false,
  });
};

export const useInfiniteProducts = (filters?: ProductFilters) => {
  return useInfiniteQuery({
    queryKey: [QUERY_KEYS.products, 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => getProducts({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    refetchOnWindowFocus: false,
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.product, id],
    queryFn: () => getProduct(id),
    enabled: !!id,
  });
};

export const useProductCounts = () => {
  return useQuery<ProductCountsResponse>({
    queryKey: ['productCounts'],
    queryFn: () => getProductCounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes - counts change infrequently
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductData) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.products] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateProductData>;
    }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.products] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.products] });
    },
  });
};

// Variant hooks
export const useProductVariants = (productId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.productVariants, productId],
    queryFn: () => getProductVariants(productId),
    enabled: !!productId,
  });
};

export const useCreateVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: CreateVariantData;
    }) => createVariant(productId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.productVariants, variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.product, variables.productId],
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventoryVariant] });
    },
  });
};

export const useUpdateVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateVariantData>;
    }) => updateVariant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.productVariants] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventoryVariant] });
    },
  });
};

export const useDeleteVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteVariant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.productVariants] });
    },
  });
};
