import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../api/categories';
import { QUERY_KEYS } from '../utils/constants';
import type { CreateCategoryData } from '../types/category';

export const useCategories = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.categories],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 30,
  });
};

export const useCategoryTree = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.categoryTree],
    queryFn: getCategoryTree,
    staleTime: 1000 * 60 * 30,
  });
};

export const useCategory = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.category, id],
    queryFn: () => getCategory(id),
    enabled: !!id,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryData) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.categories] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.categoryTree] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateCategoryData>;
    }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.categories] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.categoryTree] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.categories] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.categoryTree] });
    },
  });
};
