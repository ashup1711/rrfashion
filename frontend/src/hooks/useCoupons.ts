import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAll,
  getById,
  create,
  update,
  deleteCoupon,
} from '../api/coupons';
import { QUERY_KEYS } from '../utils/constants';
import type { CreateCouponData, UpdateCouponData } from '../types/coupon';

export const useCoupons = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.coupons],
    queryFn: getAll,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCoupon = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.coupon, id],
    queryFn: () => getById(id),
    enabled: !!id,
  });
};

export const useCreateCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCouponData) => create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.coupons] });
    },
  });
};

export const useUpdateCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCouponData;
    }) => update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.coupons] });
    },
  });
};

export const useDeleteCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.coupons] });
    },
  });
};
